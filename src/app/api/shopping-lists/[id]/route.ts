import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  itemId: z.string().min(1),
  checked: z.boolean(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

    const { id } = await params;
    const shoppingList = await prisma.shoppingList.findFirst({
      where: { id, userId },
      include: { items: { orderBy: [{ category: "asc" }, { name: "asc" }] } },
    });

    if (!shoppingList) return NextResponse.json({ error: "見つかりません。" }, { status: 404 });
    return NextResponse.json({ shoppingList });
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

  const body = updateSchema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

    const { id } = await params;
    const item = await prisma.shoppingListItem.findFirst({
      where: {
        id: body.data.itemId,
        shoppingList: { id, userId },
      },
    });
    if (!item) return NextResponse.json({ error: "見つかりません。" }, { status: 404 });

    const updated = await prisma.shoppingListItem.update({
      where: { id: item.id },
      data: { checked: body.data.checked },
    });

    return NextResponse.json({ item: updated });
  } catch {
    return NextResponse.json({ error: "現在利用できません。" }, { status: 503 });
  }
}
