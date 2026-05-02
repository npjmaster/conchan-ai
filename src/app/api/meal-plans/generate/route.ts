import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMealPlan, generateShoppingList } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { compareMealTypes, parseDateOnly } from "@/lib/date";
import { ingredientTextFromItems } from "@/lib/ingredients";
import { prisma } from "@/lib/prisma";
import { buildRecipeLinks } from "@/lib/recipeLinks";

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(7),
});

function isPrismaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError
  );
}

function generationErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "献立作成に失敗しました。";
  if (error.message === "AI機能が未設定です。") return error.message;
  if (error.message.includes("AI生成の利用上限")) return error.message;
  if (error.message.includes("OpenAI APIキー")) return error.message;
  if (error.message.includes("OpenAI APIの呼び出し")) return error.message;
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
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

    const setting = await prisma.userSetting.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        sideDishCount: 0,
        breakfastMainDishCount: 0,
        breakfastSideDishCount: 0,
        lunchMainDishCount: 0,
        lunchSideDishCount: 0,
        dinnerMainDishCount: 1,
        dinnerSideDishCount: 1,
      },
    });

    const input = {
      startDate: body.data.startDate,
      days: body.data.days,
      familySize: setting.familySize,
      mainDishCount: setting.mainDishCount,
      sideDishCount: setting.sideDishCount,
      mealDishCounts: {
        breakfast: { main: setting.breakfastMainDishCount, sides: setting.breakfastSideDishCount },
        lunch: { main: setting.lunchMainDishCount, sides: setting.lunchSideDishCount },
        dinner: { main: setting.dinnerMainDishCount, sides: setting.dinnerSideDishCount },
      },
      includeBreakfast: setting.includeBreakfast,
      includeLunch: setting.includeLunch,
      includeDinner: setting.includeDinner,
      allergies: setting.allergies,
      lowSalt: setting.lowSalt,
      lowSugar: setting.lowSugar,
      lowFat: setting.lowFat,
    };

    const mealPlanJson = await generateMealPlan(input);
    const shoppingListJson = await generateShoppingList(mealPlanJson, setting.familySize);

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId,
        startDate: parseDateOnly(body.data.startDate),
        days: body.data.days,
        meals: {
          create: mealPlanJson.meal_plan.flatMap((day) =>
            day.meals.map((meal) => ({
              mealDate: parseDateOnly(day.date),
              mealType: meal.type,
              dishes: {
                create: [
                  ...meal.main.map((dish) => ({
                    dishType: "main",
                    name: dish.name,
                    description: ingredientTextFromItems(dish.ingredients),
                    recipeLinks: { create: buildRecipeLinks(dish.name) },
                  })),
                  ...meal.sides.map((dish) => ({
                    dishType: "side",
                    name: dish.name,
                    description: ingredientTextFromItems(dish.ingredients),
                    recipeLinks: { create: buildRecipeLinks(dish.name) },
                  })),
                ],
              },
            })),
          ),
        },
        shoppingLists: {
          create: {
            userId,
            items: {
              create: shoppingListJson.shopping_list.map((item) => ({
                name: item.name,
                amount: item.amount,
                unit: item.unit,
                category: item.category,
                memo: item.memo,
              })),
            },
          },
        },
      },
      include: {
        meals: {
          include: { dishes: { include: { recipeLinks: true } } },
          orderBy: [{ mealDate: "asc" }],
        },
        shoppingLists: { include: { items: { orderBy: { category: "asc" } } } },
      },
    });

    mealPlan.meals.sort(
      (a, b) =>
        a.mealDate.getTime() - b.mealDate.getTime() ||
        compareMealTypes(a.mealType, b.mealType),
    );

    return NextResponse.json({ mealPlan });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Meal plan generation failed", error);
    }
    if (isPrismaError(error)) {
      return NextResponse.json({ error: "現在利用できません。" }, { status: 503 });
    }
    return NextResponse.json(
      { error: generationErrorMessage(error) },
      { status: 502 },
    );
  }
}
