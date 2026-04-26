"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";

export default function RegisterPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          familySize: Number(form.get("familySize")),
          mainDishCount: Number(form.get("mainDishCount")),
          sideDishCount: Number(form.get("sideDishCount")),
          lowSalt: form.get("lowSalt") === "on",
          lowSugar: form.get("lowSugar") === "on",
          lowFat: form.get("lowFat") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "登録に失敗しました。");
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error("登録後ログインに失敗しました。");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="container">
      <h1 className="page-title">ユーザー登録</h1>
      <section className="panel">
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            メールアドレス
            <input name="email" required type="email" />
          </label>
          <label className="field">
            パスワード
            <input minLength={8} name="password" required type="password" />
          </label>
          <label className="field">
            家族人数
            <input defaultValue={2} max={10} min={1} name="familySize" type="number" />
          </label>
          <label className="field">
            主菜数
            <input defaultValue={1} max={3} min={1} name="mainDishCount" type="number" />
          </label>
          <label className="field">
            副菜数
            <input defaultValue={1} max={5} min={0} name="sideDishCount" type="number" />
          </label>
          <div className="checks">
            <label className="check">
              <input name="lowSalt" type="checkbox" /> 減塩
            </label>
            <label className="check">
              <input name="lowSugar" type="checkbox" /> 糖質控えめ
            </label>
            <label className="check">
              <input name="lowFat" type="checkbox" /> 脂質控えめ
            </label>
          </div>
          {error && <p className="message">{error}</p>}
          <SubmitButton pending={pending}>登録して始める</SubmitButton>
        </form>
      </section>
    </main>
  );
}
