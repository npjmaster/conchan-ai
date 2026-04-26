"use client";

import { FormEvent, useEffect, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";

type Setting = {
  familySize: number;
  mainDishCount: number;
  sideDishCount: number;
  breakfastMainDishCount: number;
  breakfastSideDishCount: number;
  lunchMainDishCount: number;
  lunchSideDishCount: number;
  dinnerMainDishCount: number;
  dinnerSideDishCount: number;
  includeBreakfast: boolean;
  includeLunch: boolean;
  includeDinner: boolean;
  allergies: string;
  lowSalt: boolean;
  lowSugar: boolean;
  lowFat: boolean;
};

const defaultSetting: Setting = {
  familySize: 2,
  mainDishCount: 1,
  sideDishCount: 1,
  breakfastMainDishCount: 1,
  breakfastSideDishCount: 1,
  lunchMainDishCount: 1,
  lunchSideDishCount: 1,
  dinnerMainDishCount: 1,
  dinnerSideDishCount: 1,
  includeBreakfast: false,
  includeLunch: false,
  includeDinner: true,
  allergies: "",
  lowSalt: false,
  lowSugar: false,
  lowFat: false,
};

export default function SettingsPage() {
  const [setting, setSetting] = useState<Setting>(defaultSetting);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => {
        if (!response.ok) throw new Error("ログインが必要です。");
        return response.json();
      })
      .then((data) => setSetting(data.setting))
      .catch((err) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload: Setting = {
      familySize: Number(form.get("familySize")),
      mainDishCount: Number(form.get("mainDishCount")),
      sideDishCount: Number(form.get("sideDishCount")),
      breakfastMainDishCount: Number(form.get("breakfastMainDishCount")),
      breakfastSideDishCount: Number(form.get("breakfastSideDishCount")),
      lunchMainDishCount: Number(form.get("lunchMainDishCount")),
      lunchSideDishCount: Number(form.get("lunchSideDishCount")),
      dinnerMainDishCount: Number(form.get("dinnerMainDishCount")),
      dinnerSideDishCount: Number(form.get("dinnerSideDishCount")),
      includeBreakfast: form.get("includeBreakfast") === "on",
      includeLunch: form.get("includeLunch") === "on",
      includeDinner: form.get("includeDinner") === "on",
      allergies: String(form.get("allergies") ?? ""),
      lowSalt: form.get("lowSalt") === "on",
      lowSugar: form.get("lowSugar") === "on",
      lowFat: form.get("lowFat") === "on",
    };

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存に失敗しました。");
      setSetting(data.setting);
      setMessage("設定を保存しました。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="container">
      <h1 className="page-title">ユーザー設定</h1>
      <section className="panel">
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            家族人数
            <input defaultValue={setting.familySize} key={`family-${setting.familySize}`} max={10} min={1} name="familySize" type="number" />
          </label>
          <label className="field">
            主菜数
            <input defaultValue={setting.mainDishCount} key={`main-${setting.mainDishCount}`} max={3} min={1} name="mainDishCount" type="number" />
          </label>
          <label className="field">
            副菜数
            <input defaultValue={setting.sideDishCount} key={`side-${setting.sideDishCount}`} max={5} min={0} name="sideDishCount" type="number" />
          </label>
          <div className="grid two">
            <label className="field">
              朝食の主菜数
              <input defaultValue={setting.breakfastMainDishCount} key={`breakfast-main-${setting.breakfastMainDishCount}`} max={3} min={1} name="breakfastMainDishCount" type="number" />
            </label>
            <label className="field">
              朝食の副菜数
              <input defaultValue={setting.breakfastSideDishCount} key={`breakfast-side-${setting.breakfastSideDishCount}`} max={5} min={0} name="breakfastSideDishCount" type="number" />
            </label>
            <label className="field">
              昼食の主菜数
              <input defaultValue={setting.lunchMainDishCount} key={`lunch-main-${setting.lunchMainDishCount}`} max={3} min={1} name="lunchMainDishCount" type="number" />
            </label>
            <label className="field">
              昼食の副菜数
              <input defaultValue={setting.lunchSideDishCount} key={`lunch-side-${setting.lunchSideDishCount}`} max={5} min={0} name="lunchSideDishCount" type="number" />
            </label>
            <label className="field">
              夕食の主菜数
              <input defaultValue={setting.dinnerMainDishCount} key={`dinner-main-${setting.dinnerMainDishCount}`} max={3} min={1} name="dinnerMainDishCount" type="number" />
            </label>
            <label className="field">
              夕食の副菜数
              <input defaultValue={setting.dinnerSideDishCount} key={`dinner-side-${setting.dinnerSideDishCount}`} max={5} min={0} name="dinnerSideDishCount" type="number" />
            </label>
          </div>
          <div className="checks">
            <span className="label">対象食事</span>
            <label className="check">
              <input defaultChecked={setting.includeBreakfast} key={`breakfast-${setting.includeBreakfast}`} name="includeBreakfast" type="checkbox" /> 朝食
            </label>
            <label className="check">
              <input defaultChecked={setting.includeLunch} key={`lunch-${setting.includeLunch}`} name="includeLunch" type="checkbox" /> 昼食
            </label>
            <label className="check">
              <input defaultChecked={setting.includeDinner} key={`dinner-${setting.includeDinner}`} name="includeDinner" type="checkbox" /> 夕食
            </label>
          </div>
          <div className="checks">
            <span className="label">健康オプション</span>
            <label className="check">
              <input defaultChecked={setting.lowSalt} key={`salt-${setting.lowSalt}`} name="lowSalt" type="checkbox" /> 減塩
            </label>
            <label className="check">
              <input defaultChecked={setting.lowSugar} key={`sugar-${setting.lowSugar}`} name="lowSugar" type="checkbox" /> 糖質控えめ
            </label>
            <label className="check">
              <input defaultChecked={setting.lowFat} key={`fat-${setting.lowFat}`} name="lowFat" type="checkbox" /> 脂質控えめ
            </label>
          </div>
          <label className="field">
            アレルギー・避けたい食材
            <input defaultValue={setting.allergies} key={`allergies-${setting.allergies}`} name="allergies" placeholder="例：えび、そば、卵" type="text" />
          </label>
          {error && <p className="message">{error}</p>}
          {message && <p className="success">{message}</p>}
          <SubmitButton pending={pending}>保存する</SubmitButton>
        </form>
      </section>
    </main>
  );
}
