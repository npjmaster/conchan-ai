"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function onSignOut() {
    await signOut({ redirect: false, callbackUrl: "/" });
    router.replace("/");
    router.refresh();
  }

  return (
    <button onClick={onSignOut} type="button">
      ログアウト
    </button>
  );
}
