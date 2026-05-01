import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMealPlan, generateShoppingList } from "@/lib/ai";
import { currentDateOnly } from "@/lib/date";
import { buildRecipeLinks } from "@/lib/recipeLinks";

const schema = z.object({
  familySize: z.number().int().min(1).max(100).default(2),
  mainDishCount: z.number().int().min(1).max(3).default(1),
  sideDishCount: z.number().int().min(0).max(10).default(1),
  allergies: z.string().max(200).default(""),
  lowSalt: z.boolean().default(false),
  lowSugar: z.boolean().default(false),
  lowFat: z.boolean().default(false),
});

function generationErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "献立作成に失敗しました。";
  if (error.message === "AI機能が未設定です。") return error.message;
  if (error.message.includes("JSON")) return error.message;
  return "献立作成に失敗しました。";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const body = schema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  try {
    const mealPlan = await generateMealPlan({
      startDate: currentDateOnly(),
      days: 1,
      familySize: body.data.familySize,
      mainDishCount: body.data.mainDishCount,
      sideDishCount: body.data.sideDishCount,
      allergies: body.data.allergies,
      includeBreakfast: false,
      includeLunch: false,
      includeDinner: true,
      lowSalt: body.data.lowSalt,
      lowSugar: body.data.lowSugar,
      lowFat: body.data.lowFat,
    });
    const shoppingList = await generateShoppingList(mealPlan, body.data.familySize);
    const recipeLinks = mealPlan.meal_plan.flatMap((day) =>
      day.meals.flatMap((meal) =>
        [...meal.main, ...meal.sides].map((dish) => ({
          dishName: dish.name,
          links: buildRecipeLinks(dish.name),
        })),
      ),
    );

    return NextResponse.json({ mealPlan, shoppingList, recipeLinks });
  } catch (error) {
    return NextResponse.json(
      { error: generationErrorMessage(error) },
      { status: 502 },
    );
  }
}
