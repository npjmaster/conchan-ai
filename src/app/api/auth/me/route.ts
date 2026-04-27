import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    return NextResponse.json({ user: session?.user ?? null });
  } catch {
    return NextResponse.json({ error: "現在利用できません。" }, { status: 503 });
  }
}
