import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { authOptions } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "献ちゃんAI",
  description: "毎日の献立と買い物リストをあたたかく支えるAIサービス",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ja">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link className="brand" href="/">
                <Image alt="献ちゃんAI" height={44} priority src="/logo_conchan5.png" width={180} />
              </Link>
              <nav className="nav">
                {session?.user ? (
                  <>
                    <Link href="/dashboard">マイページ</Link>
                    <Link href="/generate">献立生成</Link>
                    <Link href="/settings">設定</Link>
                    <SignOutButton />
                  </>
                ) : (
                  <>
                    <Link href="/register">ユーザー登録</Link>
                    <Link href="/login">ログイン</Link>
                  </>
                )}
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
