import { z } from "zod";
import { addDays, mealTypeOrder } from "./date";
import type { GenerateInput, MealPlanJson, ShoppingListJson } from "./types";

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

const condiments = ["しょうゆ", "醤油", "みりん", "味噌", "砂糖", "塩", "こしょう", "油", "酢", "酒"];
const ingredientRules = [
  { match: "鶏むね", name: "鶏むね肉", amount: 120, unit: "g", category: "肉類" },
  { match: "鶏", name: "鶏肉", amount: 120, unit: "g", category: "肉類" },
  { match: "さば", name: "さば", amount: 1, unit: "切れ", category: "魚介類" },
  { match: "サバ", name: "さば", amount: 1, unit: "切れ", category: "魚介類" },
  { match: "鮭", name: "鮭", amount: 1, unit: "切れ", category: "魚介類" },
  { match: "豚", name: "豚肉", amount: 100, unit: "g", category: "肉類" },
  { match: "白身魚", name: "白身魚", amount: 1, unit: "切れ", category: "魚介類" },
  { match: "豆腐", name: "豆腐", amount: 1, unit: "丁", category: "豆類・豆製品" },
  { match: "卵", name: "卵", amount: 1, unit: "個", category: "卵類" },
  { match: "納豆", name: "納豆", amount: 1, unit: "パック", category: "豆類・豆製品" },
  { match: "小松菜", name: "小松菜", amount: 0.5, unit: "束", category: "野菜" },
  { match: "にんじん", name: "にんじん", amount: 0.5, unit: "本", category: "野菜" },
  { match: "きゅうり", name: "きゅうり", amount: 1, unit: "本", category: "野菜" },
  { match: "わかめ", name: "わかめ", amount: 5, unit: "g", category: "海藻類" },
  { match: "かぼちゃ", name: "かぼちゃ", amount: 0.25, unit: "個", category: "野菜" },
  { match: "トマト", name: "トマト", amount: 1, unit: "個", category: "野菜" },
  { match: "ほうれん草", name: "ほうれん草", amount: 0.5, unit: "束", category: "野菜" },
  { match: "きのこ", name: "しめじ", amount: 1, unit: "パック", category: "きのこ類" },
  { match: "しめじ", name: "しめじ", amount: 1, unit: "パック", category: "きのこ類" },
  { match: "ごはん", name: "米", amount: 0.5, unit: "合", category: "米・麺" },
  { match: "丼", name: "米", amount: 0.5, unit: "合", category: "米・麺" },
  { match: "うどん", name: "うどん", amount: 1, unit: "玉", category: "米・麺" },
  { match: "サンド", name: "食パン", amount: 2, unit: "枚", category: "パン" },
  { match: "ツナ", name: "ツナ缶", amount: 0.5, unit: "缶", category: "魚介類" },
];

type MealPlanDay = MealPlanJson["meal_plan"][number];
type MealPlanMeal = MealPlanDay["meals"][number];

function isMeal(value: MealPlanMeal | undefined): value is MealPlanMeal {
  return Boolean(value);
}

function normalizeShoppingList(data: ShoppingListJson): ShoppingListJson {
  return {
    shopping_list: data.shopping_list.map((item) => {
      const isCondiment =
        item.category === "調味料" || condiments.some((name) => item.name.includes(name));
      if (!isCondiment) return item;
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
      // Ignore malformed error bodies and fall back to the HTTP status.
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
  const items = new Map<string, { name: string; amount?: string; unit?: string; category: string; memo?: string }>();
  const add = (item: { name: string; amount?: string; unit?: string; category: string; memo?: string }) => {
    const key = `${item.category}:${item.name}:${item.unit ?? ""}`;
    const current = items.get(key);
    const amount = Number(item.amount);
    if (current && item.amount && current.amount && !Number.isNaN(amount) && !Number.isNaN(Number(current.amount))) {
      items.set(key, { ...current, amount: String(Number(current.amount) + amount) });
      return;
    }
    if (!current) items.set(key, item);
  };

  for (const day of plan.meal_plan) {
    for (const meal of day.meals) {
      for (const dish of [...meal.main, ...meal.sides]) {
        for (const item of dish.ingredients?.length ? dish.ingredients : ingredientsFromDishName(dish.name, familySize)) {
          add(item);
        }
      }
    }
  }

  return normalizeShoppingList({ shopping_list: Array.from(items.values()) });
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
- 各料理のingredientsには、その料理に実際に使う主要食材だけを入れる
- 料理に使わない食材や調味料をingredientsに入れない
- アレルギー・避けたい食材に該当する料理や食材は出力しない
- 同じ料理が続きすぎないようにする
- 同じ条件でも毎回まったく同じ献立にならないよう、一般的な家庭料理の範囲で少し変化をつける
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
  if (!parsed.success) throw new Error("AIの買い物リストJSON形式が不正です。");
  return parsed.data;
}
