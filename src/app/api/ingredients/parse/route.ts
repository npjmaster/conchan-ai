import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  aggregateShoppingItems,
  formatIngredientText,
  normalizeShoppingCategory,
  parseIngredientText,
  scaleShoppingItems,
} from "@/lib/ingredients";

const itemSchema = z.object({
  name: z.string().min(1),
  amount: z.string().optional(),
  unit: z.string().optional(),
  category: z.string().min(1).default("その他"),
});

const responseSchema = z.object({
  items: z.array(itemSchema),
});

const requestSchema = z.object({
  dishes: z.array(
    z.object({
      sourceKey: z.string().optional(),
      ingredientsText: z.string(),
      servingSize: z.number().positive().default(1),
    }),
  ),
  targetServingSize: z.number().positive().default(1),
});

function extractJson(text: string) {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  return JSON.parse(jsonText);
}

async function parseWithAi(text: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text.trim()) return undefined;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.5",
      input: `クックパッドやクラシルからコピーした材料テキストを解析してください。
食材ではない見出し、(A)、代用OK、作り方、メモ、区切り文字は除外してください。
製品名やブランド名が書かれている場合は、一般名に置き換えず、製品名をそのまま name に入れてください。
オリーブオイル、ごま油、サラダ油などの油は category を「油」にしてください。
しょうゆ、みりん、味噌、砂糖、塩、こしょう、酢、酒、だし、ソース、ケチャップ、マヨネーズなどの調味料は category を「調味料」にしてください。
粉類（小麦粉、片栗粉、薄力粉、強力粉、パン粉、米粉、粉チーズなど）は category を「粉類」にしてください。
油、調味料、粉類の amount と unit は空にしてください。
「1枚(300g)」は amount: "1", unit: "枚(300g)" のように、括弧内も unit に含めてください。
返答は JSON のみです。
形式: {"items":[{"name":"食材名","amount":"数値または分数","unit":"単位","category":"カテゴリ"}]}

材料テキスト:
${text}`,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!response.ok) return undefined;
  const data = await response.json();
  const outputText =
    typeof data.output_text === "string"
      ? data.output_text
      : data.output
          ?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? [])
          ?.map((content: { text?: string }) => content.text)
          ?.filter(Boolean)
          ?.join("");
  if (!outputText) return undefined;

  const parsed = responseSchema.safeParse(extractJson(outputText));
  return parsed.success ? parsed.data.items : undefined;
}

function preserveProductName(text: string, items: z.infer<typeof itemSchema>[]) {
  const productLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /JOYL|AJINOMOTO|®|「|」/.test(line) && /オリーブオイル|油/.test(line));

  if (!productLine) return items;
  return items.map((item) =>
    /オリーブオイル|油/.test(item.name)
      ? { ...item, name: productLine.normalize("NFKC"), amount: undefined, unit: undefined, category: "油" }
      : item,
  );
}

function removePhantomSeasonings(text: string, items: z.infer<typeof itemSchema>[]) {
  const normalizedText = text.normalize("NFKC");
  return items
    .map((item) => {
      if (item.name === "油" && normalizedText.includes("オリーブオイル")) {
        return { ...item, name: "オリーブオイル", category: "油", amount: undefined, unit: undefined };
      }
      return item;
    })
    .filter((item) => {
      const category = normalizeShoppingCategory({ name: item.name, category: item.category });
      if (!["調味料", "油"].includes(category)) return true;
      return normalizedText.includes(item.name);
    });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const body = requestSchema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const parsedDishes = await Promise.all(
    body.data.dishes.map(async (dish) => {
      const scale = body.data.targetServingSize / dish.servingSize;
      let aiItems: z.infer<typeof itemSchema>[] | undefined = undefined;
      try {
        aiItems = await parseWithAi(dish.ingredientsText);
      } catch {
        aiItems = undefined;
      }

      const items = aiItems?.length
        ? scaleShoppingItems(removePhantomSeasonings(dish.ingredientsText, preserveProductName(dish.ingredientsText, aiItems)), scale)
        : parseIngredientText(dish.ingredientsText, scale);

      return {
        sourceKey: dish.sourceKey,
        ingredientsText: formatIngredientText(items),
        items,
      };
    }),
  );

  return NextResponse.json({
    dishes: parsedDishes.map(({ sourceKey, ingredientsText }) => ({ sourceKey, ingredientsText })),
    items: aggregateShoppingItems(parsedDishes.flatMap((dish) => dish.items)),
  });
}
