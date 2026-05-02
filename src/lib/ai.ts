import { z } from "zod";
import { addDays, mealTypeOrder } from "./date";
import { aggregateShoppingItems } from "./ingredients";
import type { GenerateInput, MealPlanJson, ShoppingItem, ShoppingListJson } from "./types";

const shoppingItemSchema = z.object({
  name: z.string().min(1),
  amount: z.string().optional(),
  unit: z.string().optional(),
  category: z.string().min(1),
  memo: z.string().optional(),
});

const dishSchema = z.object({
  name: z.string().min(1),
  ingredients: z.array(shoppingItemSchema).optional(),
});

const mealPlanSchema = z.object({
  meal_plan: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      meals: z.array(
        z.object({
          type: z.enum(["breakfast", "lunch", "dinner"]),
          main: z.array(dishSchema),
          sides: z.array(dishSchema),
        }),
      ),
    }),
  ),
});

const shoppingListSchema = z.object({
  shopping_list: z.array(shoppingItemSchema),
});

const condimentNames = [
  "しょうゆ",
  "醤油",
  "みりん",
  "味噌",
  "砂糖",
  "塩",
  "こしょう",
  "胡椒",
  "酢",
  "酒",
  "料理酒",
  "だし",
  "ごま油",
  "油",
  "オリーブオイル",
  "マヨネーズ",
  "ケチャップ",
  "ソース",
  "カレー粉",
];

const ingredientRules = [
  { match: "鶏", name: "鶏肉", amount: 120, unit: "g", category: "肉類" },
  { match: "豚", name: "豚肉", amount: 120, unit: "g", category: "肉類" },
  { match: "牛", name: "牛肉", amount: 120, unit: "g", category: "肉類" },
  { match: "鮭", name: "鮭", amount: 1, unit: "切れ", category: "魚介類" },
  { match: "さば", name: "さば", amount: 1, unit: "切れ", category: "魚介類" },
  { match: "サバ", name: "さば", amount: 1, unit: "切れ", category: "魚介類" },
  { match: "魚", name: "魚", amount: 1, unit: "切れ", category: "魚介類" },
  { match: "卵", name: "卵", amount: 1, unit: "個", category: "卵類" },
  { match: "豆腐", name: "豆腐", amount: 0.5, unit: "丁", category: "豆・豆製品" },
  { match: "納豆", name: "納豆", amount: 1, unit: "パック", category: "豆・豆製品" },
  { match: "小松菜", name: "小松菜", amount: 0.5, unit: "束", category: "野菜" },
  { match: "にんじん", name: "にんじん", amount: 0.5, unit: "本", category: "野菜" },
  { match: "きゅうり", name: "きゅうり", amount: 1, unit: "本", category: "野菜" },
  { match: "わかめ", name: "わかめ", amount: 5, unit: "g", category: "海藻類" },
  { match: "かぼちゃ", name: "かぼちゃ", amount: 0.25, unit: "個", category: "野菜" },
  { match: "トマト", name: "トマト", amount: 1, unit: "個", category: "野菜" },
  { match: "ほうれん草", name: "ほうれん草", amount: 0.5, unit: "束", category: "野菜" },
  { match: "きのこ", name: "きのこ", amount: 1, unit: "パック", category: "きのこ類" },
  { match: "しめじ", name: "しめじ", amount: 1, unit: "パック", category: "きのこ類" },
  { match: "ご飯", name: "米", amount: 0.5, unit: "合", category: "米・麺" },
  { match: "丼", name: "米", amount: 0.5, unit: "合", category: "米・麺" },
  { match: "うどん", name: "うどん", amount: 1, unit: "玉", category: "米・麺" },
  { match: "サンド", name: "食パン", amount: 2, unit: "枚", category: "米・麺" },
  { match: "ツナ", name: "ツナ缶", amount: 0.5, unit: "缶", category: "魚介類" },
];

type MealPlanDay = MealPlanJson["meal_plan"][number];
type MealPlanMeal = MealPlanDay["meals"][number];

function isMeal(value: MealPlanMeal | undefined): value is MealPlanMeal {
  return Boolean(value);
}

function isCondiment(item: Pick<ShoppingItem, "name" | "category">) {
  return item.category === "調味料" || condimentNames.some((name) => item.name.includes(name));
}

function normalizeShoppingList(data: ShoppingListJson): ShoppingListJson {
  return {
    shopping_list: data.shopping_list.map((item) => {
      if (!isCondiment(item)) return item;
      return { ...item, category: "調味料", amount: undefined, unit: undefined };
    }),
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error("AIの応答がJSONではありません。");
  }
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI機能が未設定です。");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.5",
      input: prompt,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!response.ok) {
    let code = "";
    try {
      const data = await response.json();
      code = typeof data.error?.code === "string" ? data.error.code : "";
    } catch {
      // Fall back to the HTTP status below.
    }
    if (response.status === 429 || code === "insufficient_quota") {
      throw new Error("AI生成の利用上限に達しています。OpenAIのプランまたは請求設定を確認してください。");
    }
    if (response.status === 401) {
      throw new Error("OpenAI APIキーを確認してください。");
    }
    throw new Error(`OpenAI APIの呼び出しに失敗しました。ステータス: ${response.status}`);
  }

  const data = await response.json();
  if (typeof data.output_text === "string") return data.output_text;

  const text = data.output
    ?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? [])
    ?.map((content: { text?: string }) => content.text)
    ?.filter(Boolean)
    ?.join("");

  if (!text) throw new Error("OpenAI APIの応答本文を取得できませんでした。");
  return text;
}

function normalizeMealPlan(input: GenerateInput, data: MealPlanJson): MealPlanJson {
  const enabledMeals = mealTypeOrder.filter((type) => {
    if (type === "breakfast") return input.includeBreakfast;
    if (type === "lunch") return input.includeLunch;
    return input.includeDinner;
  });
  const expectedMeals = enabledMeals.length > 0 ? enabledMeals : ["dinner"];
  const days = Array.from({ length: input.days }, (_, index) => {
    const date = addDays(input.startDate, index);
    const sourceDay = data.meal_plan.find((day) => day.date === date) ?? data.meal_plan[index];
    return {
      date,
      meals: expectedMeals
        .map((type) => sourceDay?.meals.find((meal) => meal.type === type))
        .filter(isMeal)
        .map((meal) => ({
          ...meal,
          main: meal.main.slice(0, input.mealDishCounts?.[meal.type]?.main ?? input.mainDishCount),
          sides: meal.sides.slice(0, input.mealDishCounts?.[meal.type]?.sides ?? input.sideDishCount),
        })),
    };
  });
  return { meal_plan: days };
}

function condimentsFromDishName(dishName: string): ShoppingItem[] {
  const items = new Map<string, ShoppingItem>();
  const add = (name: string) => items.set(name, { name, category: "調味料" });

  if (dishName.includes("味噌") || dishName.includes("みそ")) add("味噌");
  if (dishName.includes("照り焼き") || dishName.includes("煮") || dishName.includes("丼")) {
    add("しょうゆ");
    add("みりん");
  }
  if (dishName.includes("酢") || dishName.includes("南蛮")) add("酢");
  if (dishName.includes("炒め")) add("油");
  if (dishName.includes("カレー")) add("カレー粉");
  return Array.from(items.values());
}

function ingredientsFromDishName(dishName: string, familySize: number) {
  const items = ingredientRules
    .filter((rule) => dishName.includes(rule.match))
    .map((rule) => ({
      name: rule.name,
      amount: String(rule.amount * familySize),
      unit: rule.unit,
      category: rule.category,
    }));
  return items.length > 0 ? items : [{ name: dishName, amount: String(familySize), unit: "食分", category: "その他" }];
}

function buildShoppingListFromPlan(plan: MealPlanJson, familySize: number): ShoppingListJson {
  const items = new Map<string, ShoppingItem>();
  const collectedItems: ShoppingItem[] = [];
  const add = (item: ShoppingItem) => {
    const normalized = isCondiment(item)
      ? { ...item, category: "調味料", amount: undefined, unit: undefined }
      : item;
    const key = `${normalized.category}:${normalized.name}:${normalized.unit ?? ""}`;
    const current = items.get(key);
    const amount = Number(normalized.amount);
    if (current && normalized.amount && current.amount && !Number.isNaN(amount) && !Number.isNaN(Number(current.amount))) {
      items.set(key, { ...current, amount: String(Number(current.amount) + amount) });
      return;
    }
    if (!current) items.set(key, normalized);
  };

  for (const day of plan.meal_plan) {
    for (const meal of day.meals) {
      for (const dish of [...meal.main, ...meal.sides]) {
        for (const item of dish.ingredients?.length ? dish.ingredients : ingredientsFromDishName(dish.name, familySize)) {
          collectedItems.push(item);
        }
      }
    }
  }

  return normalizeShoppingList({ shopping_list: aggregateShoppingItems(collectedItems) });
}

export async function generateMealPlan(input: GenerateInput): Promise<MealPlanJson> {
  const prompt = `
あなたは家庭向け献立作成AIです。必ずJSONのみを返してください。説明文、Markdown、補足は禁止です。

JSON形式:
{"meal_plan":[{"date":"YYYY-MM-DD","meals":[{"type":"breakfast","main":[{"name":"主菜名","ingredients":[{"name":"食材名","amount":"分量","unit":"単位","category":"カテゴリ"}]}],"sides":[{"name":"副菜名","ingredients":[{"name":"食材名","amount":"分量","unit":"単位","category":"カテゴリ"}]}]}]}]}

条件:
- 開始日: ${input.startDate}
- 日数: ${input.days}
- 家族人数: ${input.familySize}
- 主菜数: ${input.mainDishCount}
- 副菜数: ${input.sideDishCount}
- 朝食の主菜数/副菜数: ${input.mealDishCounts?.breakfast?.main ?? input.mainDishCount}/${input.mealDishCounts?.breakfast?.sides ?? input.sideDishCount}
- 昼食の主菜数/副菜数: ${input.mealDishCounts?.lunch?.main ?? input.mainDishCount}/${input.mealDishCounts?.lunch?.sides ?? input.sideDishCount}
- 夕食の主菜数/副菜数: ${input.mealDishCounts?.dinner?.main ?? input.mainDishCount}/${input.mealDishCounts?.dinner?.sides ?? input.sideDishCount}
- 朝食: ${input.includeBreakfast}
- 昼食: ${input.includeLunch}
- 夕食: ${input.includeDinner}
- アレルギー・避けたい食材: ${input.allergies?.trim() || "なし"}
- 減塩: ${input.lowSalt}
- 糖質控えめ: ${input.lowSugar}
- 脂質控えめ: ${input.lowFat}
- 有効な食事だけを朝食、昼食、夕食の順に出力する
- dateは開始日から日数分をYYYY-MM-DDで出力する
- ingredientsには料理に使う主な食材と調味料を入れる
- 調味料のcategoryは必ず「調味料」にし、amountとunitは空にする
- 料理に使わない食材はingredientsに入れない
- アレルギー・避けたい食材に該当する料理や食材は出力しない
- 同じ料理が続きすぎないようにする
`;

  let lastError = new Error("AIの献立JSON形式が不正です。");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const output = await callOpenAI(prompt);
    try {
      const parsed = mealPlanSchema.safeParse(extractJson(output));
      if (parsed.success) return normalizeMealPlan(input, parsed.data);
      lastError = new Error("AIの献立JSON形式が不正です。");
    } catch (error) {
      lastError = error instanceof Error ? error : lastError;
    }
  }

  throw lastError;
}

export async function generateShoppingList(
  plan: MealPlanJson,
  familySize: number,
): Promise<ShoppingListJson> {
  const parsed = shoppingListSchema.safeParse(buildShoppingListFromPlan(plan, familySize));
  if (!parsed.success) throw new Error("AIの食材リストJSON形式が不正です。");
  return parsed.data;
}
