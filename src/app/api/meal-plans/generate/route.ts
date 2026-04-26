import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMealPlan, generateShoppingList } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { parseDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { buildRecipeLinks } from "@/lib/recipeLinks";

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(7),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const setting = await prisma.userSetting.upsert({
    where: { userId },
    update: {},
    create: { userId },
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

  try {
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
                    recipeLinks: { create: buildRecipeLinks(dish.name) },
                  })),
                  ...meal.sides.map((dish) => ({
                    dishType: "side",
                    name: dish.name,
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

    return NextResponse.json({ mealPlan });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成に失敗しました。" },
      { status: 502 },
    );
  }
}
