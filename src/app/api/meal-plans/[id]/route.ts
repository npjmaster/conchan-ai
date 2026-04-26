import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  return NextResponse.json({ mealPlan });
}
