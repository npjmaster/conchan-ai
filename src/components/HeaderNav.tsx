"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

export function HeaderNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const showGuestNav = pathname === "/" || !isLoggedIn;

  return (
    <nav className="nav">
      {showGuestNav ? (
        <>
          <Link href="/register">ユーザー登録</Link>
          <Link href="/login">ログイン</Link>
        </>
      ) : (
        <>
          <Link href="/dashboard">マイページ</Link>
          <Link href="/generate">献立作成</Link>
          <Link href="/settings">設定</Link>
          <SignOutButton />
        </>
      )}
    </nav>
  );
}
