"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError("メールアドレスまたはパスワードが違います。");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="container">
      <h1 className="page-title">ログイン</h1>
      <section className="panel">
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            メールアドレス
            <input name="email" required type="email" />
          </label>
          <label className="field">
            パスワード
            <input name="password" required type="password" />
          </label>
          {error && <p className="message">{error}</p>}
          <SubmitButton pending={pending} pendingText="ログイン中">
            ログインする
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
