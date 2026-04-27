import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  familySize: z.number().int().min(1).max(10).default(2),
  mainDishCount: z.number().int().min(1).max(3).default(1),
  sideDishCount: z.number().int().min(0).max(5).default(1),
  lowSalt: z.boolean().default(false),
  lowSugar: z.boolean().default(false),
  lowFat: z.boolean().default(false),
});

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
    const email = body.data.email.toLowerCase().trim();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "このメールアドレスは登録済みです。" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.data.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        setting: {
          create: {
            familySize: body.data.familySize,
            mainDishCount: body.data.mainDishCount,
            sideDishCount: body.data.sideDishCount,
            includeBreakfast: false,
            includeLunch: false,
            includeDinner: true,
            lowSalt: body.data.lowSalt,
            lowSugar: body.data.lowSugar,
            lowFat: body.data.lowFat,
          },
        },
      },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "現在利用できません。" }, { status: 503 });
  }
}
