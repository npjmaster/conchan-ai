import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { compareMealTypes } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { buildRecipeLinks } from "@/lib/recipeLinks";

const patchSchema = z.object({
  dishes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      ingredientsText: z.string().optional(),
    }),
  ),
  shoppingItems: z.array(
    z.object({
      name: z.string().min(1),
      amount: z.string().nullish(),
      unit: z.string().nullish(),
      category: z.string().min(1),
    }),
  ),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

    const { id } = await params;
    const mealPlan = await prisma.mealPlan.findFirst({
      where: { id, userId },
      include: {
        meals: {
          include: { dishes: { include: { recipeLinks: true } } },
          orderBy: [{ mealDate: "asc" }, { mealType: "asc" }],
        },
        shoppingLists: {
          include: { items: { orderBy: [{ category: "asc" }, { name: "asc" }] } },
        },
      },
    });

    if (!mealPlan) return NextResponse.json({ error: "見つかりません。" }, { status: 404 });
    mealPlan.meals.sort(
      (a, b) =>
        a.mealDate.getTime() - b.mealDate.getTime() ||
        compareMealTypes(a.mealType, b.mealType),
    );
    return NextResponse.json({ mealPlan });
  } catch {
    return NextResponse.json({ error: "現在利用できません。" }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  const body = patchSchema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

    const { id } = await params;
    const mealPlan = await prisma.mealPlan.findFirst({
      where: { id, userId },
      include: {
        meals: { include: { dishes: true } },
        shoppingLists: true,
      },
    });

    if (!mealPlan) return NextResponse.json({ error: "献立が見つかりません。" }, { status: 404 });

    const dishIds = new Set(mealPlan.meals.flatMap((meal) => meal.dishes.map((dish) => dish.id)));
    const shoppingList =
      mealPlan.shoppingLists[0] ??
      (await prisma.shoppingList.create({
        data: { mealPlanId: mealPlan.id, userId },
      }));

    const shoppingItemWrites =
      body.data.shoppingItems.length > 0
        ? [
            prisma.shoppingListItem.createMany({
              data: body.data.shoppingItems.map((item) => ({
                shoppingListId: shoppingList.id,
                name: item.name,
                amount: item.amount || null,
                unit: item.unit || null,
                category: item.category,
              })),
            }),
          ]
        : [];

    await prisma.$transaction([
      ...body.data.dishes
        .filter((dish) => dishIds.has(dish.id))
        .flatMap((dish) => [
          prisma.dish.update({
            where: { id: dish.id },
            data: {
              name: dish.name,
              description: dish.ingredientsText ?? "",
            },
          }),
          prisma.recipeLink.deleteMany({ where: { dishId: dish.id } }),
          prisma.recipeLink.createMany({
            data: buildRecipeLinks(dish.name).map((link) => ({
              dishId: dish.id,
              serviceName: link.serviceName,
              searchUrl: link.searchUrl,
            })),
          }),
        ]),
      prisma.shoppingListItem.deleteMany({ where: { shoppingListId: shoppingList.id } }),
      ...shoppingItemWrites,
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Meal plan update failed", error);
    }
    return NextResponse.json({ error: "保存に失敗しました。" }, { status: 500 });
  }
}
