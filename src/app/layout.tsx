import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { authOptions } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "こんちゃんAI",
  description: "毎日の献立と食材リストをあなたに合わせて考えるAIサービス",
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
                <Image alt="こんちゃんAI" height={44} priority src="/logo_conchan5.png" width={180} />
              </Link>
              <HeaderNav isLoggedIn={Boolean(session?.user)} />
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
