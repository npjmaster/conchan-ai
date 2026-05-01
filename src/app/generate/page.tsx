"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";

export default function GeneratePage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/meal-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: String(form.get("startDate")),
          days: Number(form.get("days")),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "献立作成に失敗しました。");
      router.push(`/meal-plans/${data.mealPlan.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "献立作成に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="container">
      <h1 className="page-title">献立のご提案</h1>
      <p className="lead">最大7日分の献立を考えます。</p>
      <section className="panel">
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            開始日
            <input defaultValue={today} name="startDate" required type="date" />
          </label>
          <label className="field">
            日数
            <input defaultValue={3} max={7} min={1} name="days" required type="number" />
          </label>
          {error && <p className="message">{error}</p>}
          <SubmitButton pending={pending} pendingText="献立を考えています...">
            献立を考えます
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
