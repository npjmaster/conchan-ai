import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

    const mealPlans = await prisma.mealPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ mealPlans });
  } catch {
    return NextResponse.json({ error: "現在利用できません。" }, { status: 503 });
  }
}
