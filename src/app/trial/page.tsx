"use client";

import { FormEvent, useState } from "react";
import { MealPlanView } from "@/components/MealPlanView";
import { ShoppingListView } from "@/components/ShoppingListView";
import { SubmitButton } from "@/components/SubmitButton";

export default function TrialPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    mealPlan: { meal_plan: never[] };
    shoppingList: { shopping_list: never[] };
  } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const count = Number(localStorage.getItem("trial_count") ?? "0");
    if (count >= 3) {
      setError("お試し生成は最大3回までです。登録すると最大7日分まで作れます。");
      return;
    }

    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const response = await fetch("/api/trial/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familySize: Number(form.get("familySize")),
          mainDishCount: Number(form.get("mainDishCount")),
          sideDishCount: Number(form.get("sideDishCount")),
          allergies: String(form.get("allergies") ?? ""),
          lowSalt: form.get("lowSalt") === "on",
          lowSugar: form.get("lowSugar") === "on",
          lowFat: form.get("lowFat") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "生成に失敗しました。");
      localStorage.setItem("trial_count", String(count + 1));
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="container">
      <h1 className="page-title">お試し献立生成</h1>
      <p className="lead">未登録でも夕食1食分を試せます。回数はこのブラウザで最大3回です。</p>

      <section className="panel">
        <form className="form" onSubmit={onSubmit}>
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
          <label className="field">
            アレルギー・避けたい食材
            <input name="allergies" placeholder="例：えび、そば、卵" type="text" />
          </label>
          {error && <p className="message">{error}</p>}
          <SubmitButton pending={pending}>1食分を生成する</SubmitButton>
        </form>
      </section>

      {result && (
        <section className="grid" style={{ marginTop: 20 }}>
          <h2>生成結果</h2>
          <MealPlanView mealPlan={result.mealPlan} />
          <h2>買い物リスト</h2>
          <ShoppingListView items={result.shoppingList.shopping_list} />
        </section>
      )}
    </main>
  );
}
