import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  familySize: z.number().int().min(1).max(10),
  mainDishCount: z.number().int().min(1).max(3),
  sideDishCount: z.number().int().min(0).max(5),
  breakfastMainDishCount: z.number().int().min(1).max(3),
  breakfastSideDishCount: z.number().int().min(0).max(5),
  lunchMainDishCount: z.number().int().min(1).max(3),
  lunchSideDishCount: z.number().int().min(0).max(5),
  dinnerMainDishCount: z.number().int().min(1).max(3),
  dinnerSideDishCount: z.number().int().min(0).max(5),
  includeBreakfast: z.boolean(),
  includeLunch: z.boolean(),
  includeDinner: z.boolean(),
  allergies: z.string().max(200).default(""),
  lowSalt: z.boolean(),
  lowSugar: z.boolean(),
  lowFat: z.boolean(),
});

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const setting = await prisma.userSetting.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return NextResponse.json({ setting });
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  if (!body.data.includeBreakfast && !body.data.includeLunch && !body.data.includeDinner) {
    return NextResponse.json({ error: "対象食事を1つ以上選択してください。" }, { status: 400 });
  }

  const setting = await prisma.userSetting.upsert({
    where: { userId },
    update: body.data,
    create: { userId, ...body.data },
  });

  return NextResponse.json({ setting });
}
