import type { GenerateInput, MealPlanJson, MealType, ShoppingListJson } from "./types";
import { addDays } from "./date";

const mains = [
  "鶏むね肉の照り焼き",
  "鮭の味噌焼き",
  "豚しゃぶ温野菜",
  "豆腐ハンバーグ",
  "さばの生姜煮",
  "野菜たっぷり親子丼",
  "白身魚のホイル焼き",
];

const sides = [
  "小松菜のおひたし",
  "にんじんしりしり",
  "きゅうりとわかめの酢の物",
  "かぼちゃの煮物",
  "トマトと豆腐のサラダ",
  "ほうれん草のごま和え",
  "きのこの味噌汁",
];

const breakfastMains = ["鮭おにぎり", "卵焼き", "納豆ごはん"];
const lunchMains = ["鶏そぼろ丼", "野菜うどん", "ツナと卵のサンド"];

export function mockMealPlan(input: GenerateInput): MealPlanJson {
  const selectedMeals = [
    input.includeBreakfast && "breakfast",
    input.includeLunch && "lunch",
    input.includeDinner && "dinner",
  ].filter(Boolean) as ("breakfast" | "lunch" | "dinner")[];

  const mealTypes: MealType[] = selectedMeals.length > 0 ? selectedMeals : ["dinner"];
  return {
    meal_plan: Array.from({ length: input.days }, (_, dayIndex) => {
      return {
        date: addDays(input.startDate, dayIndex),
        meals: mealTypes.map((type, mealIndex) => {
          const pool =
            type === "breakfast" ? breakfastMains : type === "lunch" ? lunchMains : mains;
          const mainCount = input.mealDishCounts?.[type]?.main ?? input.mainDishCount;
          const sideCount = input.mealDishCounts?.[type]?.sides ?? input.sideDishCount;
          const excluded = input.allergies
            ?.split(/[、,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean);
          const allowedPool = excluded?.length
            ? pool.filter((dish) => excluded.every((word) => !dish.includes(word)))
            : pool;
          const allowedSides = excluded?.length
            ? sides.filter((dish) => excluded.every((word) => !dish.includes(word)))
            : sides;
          const mainPool = allowedPool.length > 0 ? allowedPool : pool;
          const sidePool = allowedSides.length > 0 ? allowedSides : sides;
          return {
            type,
            main: Array.from({ length: mainCount }, (_, index) => ({
              name: mainPool[(dayIndex + mealIndex + index) % mainPool.length],
              ingredients: ingredientsFromDishName(mainPool[(dayIndex + mealIndex + index) % mainPool.length], input.familySize),
            })),
            sides: Array.from({ length: sideCount }, (_, index) => ({
              name: sidePool[(dayIndex + mealIndex + index) % sidePool.length],
              ingredients: ingredientsFromDishName(sidePool[(dayIndex + mealIndex + index) % sidePool.length], input.familySize),
            })),
          };
        }),
      };
    }),
  };
}

function ingredientsFromDishName(dishName: string, familySize: number) {
  const items: { name: string; amount?: string; unit?: string; category: string }[] = [];
  const add = (name: string, amount: number | string, unit: string, category: string) =>
    items.push({ name, amount: String(amount), unit, category });

  if (dishName.includes("鶏むね")) add("鶏むね肉", 120 * familySize, "g", "肉・魚");
  else if (dishName.includes("鶏")) add("鶏肉", 120 * familySize, "g", "肉・魚");
  if (dishName.includes("さば")) add("さば", familySize, "切れ", "肉・魚");
  if (dishName.includes("鮭")) add("鮭", familySize, "切れ", "肉・魚");
  if (dishName.includes("豚")) add("豚肉", 100 * familySize, "g", "肉・魚");
  if (dishName.includes("豆腐")) add("豆腐", 1, "丁", "大豆・卵");
  if (dishName.includes("卵")) add("卵", familySize, "個", "大豆・卵");
  if (dishName.includes("小松菜")) add("小松菜", 1, "束", "野菜");
  if (dishName.includes("にんじん")) add("にんじん", 1, "本", "野菜");
  if (dishName.includes("きゅうり")) add("きゅうり", 2, "本", "野菜");
  if (dishName.includes("きのこ")) add("しめじ", 1, "パック", "野菜");
  return items.length > 0 ? items : [{ name: dishName, amount: String(familySize), unit: "食分", category: "その他" }];
}

export function mockShoppingList(plan: MealPlanJson, familySize: number): ShoppingListJson {
  const items = new Map<string, { name: string; amount?: string; unit?: string; category: string }>();
  const add = (name: string, amount: string | undefined, unit: string | undefined, category: string) => {
    if (!items.has(name)) items.set(name, { name, amount, unit, category });
  };

  for (const day of plan.meal_plan) {
    for (const meal of day.meals) {
      for (const dish of [...meal.main, ...meal.sides]) {
        if (dish.ingredients?.length) {
          for (const ingredient of dish.ingredients) {
            add(ingredient.name, ingredient.amount, ingredient.unit, ingredient.category);
          }
          continue;
        }
        if (dish.name.includes("鶏")) add("鶏肉", String(120 * familySize), "g", "肉・魚");
        if (dish.name.includes("さば")) add("さば", String(familySize), "切れ", "肉・魚");
        if (dish.name.includes("鮭")) add("鮭", String(familySize), "切れ", "肉・魚");
        if (dish.name.includes("豚")) add("豚肉", String(100 * familySize), "g", "肉・魚");
        if (dish.name.includes("豆腐")) add("豆腐", "1", "丁", "大豆・卵");
        if (dish.name.includes("卵")) add("卵", String(familySize), "個", "大豆・卵");
        if (dish.name.includes("小松菜")) add("小松菜", "1", "束", "野菜");
        if (dish.name.includes("にんじん")) add("にんじん", "1", "本", "野菜");
        if (dish.name.includes("きゅうり")) add("きゅうり", "2", "本", "野菜");
        if (dish.name.includes("きのこ")) add("しめじ", "1", "パック", "野菜");
      }
    }
  }

  return { shopping_list: Array.from(items.values()) };
}
