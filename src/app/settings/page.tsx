"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";

type NumericValue = number | "";

type Setting = {
  familySize: NumericValue;
  mainDishCount: NumericValue;
  sideDishCount: NumericValue;
  breakfastMainDishCount: NumericValue;
  breakfastSideDishCount: NumericValue;
  lunchMainDishCount: NumericValue;
  lunchSideDishCount: NumericValue;
  dinnerMainDishCount: NumericValue;
  dinnerSideDishCount: NumericValue;
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
  sideDishCount: 0,
  breakfastMainDishCount: 0,
  breakfastSideDishCount: 0,
  lunchMainDishCount: 0,
  lunchSideDishCount: 0,
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

function numberOrDefault(value: NumericValue, fallback: number) {
  return value === "" ? fallback : value;
}

export default function SettingsPage() {
  const [setting, setSetting] = useState<Setting>(defaultSetting);
  const [mealEnabled, setMealEnabled] = useState({
    breakfast: defaultSetting.includeBreakfast,
    lunch: defaultSetting.includeLunch,
    dinner: defaultSetting.includeDinner,
  });
  const mealEnabledRef = useRef(mealEnabled);
  const editedRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => {
        if (!response.ok) throw new Error("ログインが必要です。");
        return response.json();
      })
      .then((data) => {
        if (!editedRef.current) {
          setSetting(data.setting);
          setMealEnabled({
            breakfast: data.setting.includeBreakfast,
            lunch: data.setting.includeLunch,
            dinner: data.setting.includeDinner,
          });
          mealEnabledRef.current = {
            breakfast: data.setting.includeBreakfast,
            lunch: data.setting.includeLunch,
            dinner: data.setting.includeDinner,
          };
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const payload = {
      ...setting,
      familySize: numberOrDefault(setting.familySize, 1),
      mainDishCount: numberOrDefault(setting.mainDishCount, 1),
      sideDishCount: numberOrDefault(setting.sideDishCount, 0),
      breakfastMainDishCount: mealEnabledRef.current.breakfast
        ? numberOrDefault(setting.breakfastMainDishCount, 0)
        : 0,
      breakfastSideDishCount: mealEnabledRef.current.breakfast
        ? numberOrDefault(setting.breakfastSideDishCount, 0)
        : 0,
      lunchMainDishCount: mealEnabledRef.current.lunch
        ? numberOrDefault(setting.lunchMainDishCount, 0)
        : 0,
      lunchSideDishCount: mealEnabledRef.current.lunch
        ? numberOrDefault(setting.lunchSideDishCount, 0)
        : 0,
      dinnerMainDishCount: mealEnabledRef.current.dinner
        ? numberOrDefault(setting.dinnerMainDishCount, 0)
        : 0,
      dinnerSideDishCount: mealEnabledRef.current.dinner
        ? numberOrDefault(setting.dinnerSideDishCount, 0)
        : 0,
      includeBreakfast: mealEnabledRef.current.breakfast,
      includeLunch: mealEnabledRef.current.lunch,
      includeDinner: mealEnabledRef.current.dinner,
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
      setMealEnabled({
        breakfast: data.setting.includeBreakfast,
        lunch: data.setting.includeLunch,
        dinner: data.setting.includeDinner,
      });
      mealEnabledRef.current = {
        breakfast: data.setting.includeBreakfast,
        lunch: data.setting.includeLunch,
        dinner: data.setting.includeDinner,
      };
      editedRef.current = false;
      setMessage("設定を保存しました。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  function updateSetting(patch: Partial<Setting>) {
    editedRef.current = true;
    setSetting((current) => ({ ...current, ...patch }));
  }

  function updateNumber(name: keyof Setting, value: string) {
    editedRef.current = true;
    setSetting((current) => ({
      ...current,
      [name]: value === "" ? "" : Number(value),
    }));
  }

  function updateMealEnabled(
    meal: "breakfast" | "lunch" | "dinner",
    checked: boolean,
  ) {
    editedRef.current = true;
    mealEnabledRef.current = { ...mealEnabledRef.current, [meal]: checked };
    setMealEnabled(mealEnabledRef.current);
    setSetting((current) => {
      if (meal === "breakfast") {
        return {
          ...current,
          breakfastMainDishCount: checked ? current.breakfastMainDishCount : 0,
          breakfastSideDishCount: checked ? current.breakfastSideDishCount : 0,
        };
      }
      if (meal === "lunch") {
        return {
          ...current,
          lunchMainDishCount: checked ? current.lunchMainDishCount : 0,
          lunchSideDishCount: checked ? current.lunchSideDishCount : 0,
        };
      }
      return {
        ...current,
        dinnerMainDishCount: checked ? current.dinnerMainDishCount : 0,
        dinnerSideDishCount: checked ? current.dinnerSideDishCount : 0,
      };
    });
  }

  return (
    <main className="container">
      <h1 className="page-title">ユーザー設定</h1>
      <section className="panel">
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            家族人数
            <input max={100} min={1} name="familySize" onChange={(event) => updateNumber("familySize", event.currentTarget.value)} type="number" value={setting.familySize} />
          </label>
          <div className="checks">
            <span className="label">対象食事</span>
            <div className="check">
              <input
                checked={mealEnabled.breakfast}
                id="includeBreakfast"
                name="includeBreakfast"
                onChange={(event) => updateMealEnabled("breakfast", event.currentTarget.checked)}
                type="checkbox"
              />
              <span>朝食</span>
            </div>
            <div className="check">
              <input
                checked={mealEnabled.lunch}
                id="includeLunch"
                name="includeLunch"
                onChange={(event) => updateMealEnabled("lunch", event.currentTarget.checked)}
                type="checkbox"
              />
              <span>昼食</span>
            </div>
            <div className="check">
              <input
                checked={mealEnabled.dinner}
                id="includeDinner"
                name="includeDinner"
                onChange={(event) => updateMealEnabled("dinner", event.currentTarget.checked)}
                type="checkbox"
              />
              <span>夕食</span>
            </div>
          </div>
          <div className="meal-count-grid">
            <label className="field">
              朝食の主菜数
              <input disabled={!mealEnabled.breakfast} max={3} min={0} name="breakfastMainDishCount" onChange={(event) => updateNumber("breakfastMainDishCount", event.currentTarget.value)} type="number" value={mealEnabled.breakfast ? setting.breakfastMainDishCount : 0} />
            </label>
            <label className="field">
              朝食の副菜数
              <input disabled={!mealEnabled.breakfast} max={10} min={0} name="breakfastSideDishCount" onChange={(event) => updateNumber("breakfastSideDishCount", event.currentTarget.value)} type="number" value={mealEnabled.breakfast ? setting.breakfastSideDishCount : 0} />
            </label>
            <label className="field">
              昼食の主菜数
              <input disabled={!mealEnabled.lunch} max={3} min={0} name="lunchMainDishCount" onChange={(event) => updateNumber("lunchMainDishCount", event.currentTarget.value)} type="number" value={mealEnabled.lunch ? setting.lunchMainDishCount : 0} />
            </label>
            <label className="field">
              昼食の副菜数
              <input disabled={!mealEnabled.lunch} max={10} min={0} name="lunchSideDishCount" onChange={(event) => updateNumber("lunchSideDishCount", event.currentTarget.value)} type="number" value={mealEnabled.lunch ? setting.lunchSideDishCount : 0} />
            </label>
            <label className="field">
              夕食の主菜数
              <input disabled={!mealEnabled.dinner} max={3} min={0} name="dinnerMainDishCount" onChange={(event) => updateNumber("dinnerMainDishCount", event.currentTarget.value)} type="number" value={mealEnabled.dinner ? setting.dinnerMainDishCount : 0} />
            </label>
            <label className="field">
              夕食の副菜数
              <input disabled={!mealEnabled.dinner} max={10} min={0} name="dinnerSideDishCount" onChange={(event) => updateNumber("dinnerSideDishCount", event.currentTarget.value)} type="number" value={mealEnabled.dinner ? setting.dinnerSideDishCount : 0} />
            </label>
          </div>
          <div className="checks">
            <span className="label">健康オプション</span>
            <div className="check">
              <input checked={setting.lowSalt} id="lowSalt" name="lowSalt" onChange={(event) => updateSetting({ lowSalt: event.currentTarget.checked })} type="checkbox" />
              <span>減塩</span>
            </div>
            <div className="check">
              <input checked={setting.lowSugar} id="lowSugar" name="lowSugar" onChange={(event) => updateSetting({ lowSugar: event.currentTarget.checked })} type="checkbox" />
              <span>糖質控えめ</span>
            </div>
            <div className="check">
              <input checked={setting.lowFat} id="lowFat" name="lowFat" onChange={(event) => updateSetting({ lowFat: event.currentTarget.checked })} type="checkbox" />
              <span>脂質控えめ</span>
            </div>
          </div>
          <label className="field">
            アレルギー・避けたい食材
            <input name="allergies" onChange={(event) => updateSetting({ allergies: event.currentTarget.value })} placeholder="例：えび、そば、牛乳" type="text" value={setting.allergies} />
          </label>
          {error && <p className="message">{error}</p>}
          {message && <p className="success">{message}</p>}
          <SubmitButton pending={pending} pendingText="登録中">
            保存する
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
