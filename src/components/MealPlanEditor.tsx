"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Day, Dish, linksFor, normalizeFromApi } from "@/components/MealPlanView";
import { ShoppingListView } from "@/components/ShoppingListView";

type ShoppingItem = {
  id?: string;
  name: string;
  amount?: string | null;
  unit?: string | null;
  category: string;
  checked?: boolean;
};

type MealPlanData = {
  id: string;
  meals?: Parameters<typeof normalizeFromApi>[0]["meals"];
  meal_plan?: Day[];
};

type DishEdit = {
  name: string;
  ingredientsText: string;
  servingSize: number;
};

const mealLabels: Record<string, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
};

function dishKey(dish: Dish) {
  return dish.id ?? dish.name;
}

export function MealPlanEditor({
  familySize,
  mealPlan,
  initialItems,
  shoppingListId,
}: {
  familySize: number;
  mealPlan: MealPlanData;
  initialItems: ShoppingItem[];
  shoppingListId?: string;
}) {
  const router = useRouter();
  const days = useMemo(() => normalizeFromApi(mealPlan), [mealPlan]);
  const [dishEdits, setDishEdits] = useState<Record<string, DishEdit>>(() => {
    const entries: [string, DishEdit][] = [];
    for (const day of days) {
      for (const meal of day.meals) {
        for (const dish of [...(meal.main ?? []), ...(meal.sides ?? [])]) {
          entries.push([
            dishKey(dish),
            { name: dish.name, ingredientsText: dish.description ?? "", servingSize: familySize },
          ]);
        }
      }
    }
    return Object.fromEntries(entries);
  });
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [pending, setPending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateDish(key: string, patch: Partial<DishEdit>) {
    setDishEdits((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  }

  async function rebuildShoppingList() {
    const dishes = Object.entries(dishEdits)
      .filter(([, dish]) => dish.ingredientsText.trim())
      .map(([sourceKey, dish]) => ({ sourceKey, ...dish }));

    if (dishes.length === 0) {
      setMessage("貼り付け欄に材料がないため、食材リストはそのままです。");
      return;
    }

    setUpdating(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/ingredients/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetServingSize: familySize,
          dishes: dishes.map((dish) => ({
            sourceKey: dish.sourceKey,
            ingredientsText: dish.ingredientsText,
            servingSize: dish.servingSize || familySize,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "食材リスト更新に失敗しました。");

      setItems(data.items);
      if (Array.isArray(data.dishes)) {
        setDishEdits((current) => {
          const next = { ...current };
          for (const dish of data.dishes) {
            if (dish.sourceKey && next[dish.sourceKey]) {
              next[dish.sourceKey] = { ...next[dish.sourceKey], ingredientsText: dish.ingredientsText };
            }
          }
          return next;
        });
      }
      setMessage(`食材リストと料理ごとの材料を${familySize}人分に換算して更新しました。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "食材リスト更新に失敗しました。");
    } finally {
      setUpdating(false);
    }
  }

  async function save() {
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/meal-plans/${mealPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishes: Object.entries(dishEdits)
            .filter(([id]) => !id.includes(":"))
            .map(([id, dish]) => ({ id, ...dish })),
          shoppingItems: items.map(({ name, amount, unit, category }) => ({ name, amount, unit, category })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存に失敗しました。");
      setMessage("献立と食材リストを保存しました。");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  const renderUpdateButton = () => (
    <button disabled={updating} onClick={() => void rebuildShoppingList()} type="button">
      {updating ? "更新中..." : "食材リスト更新"}
    </button>
  );

  return (
    <>
      <section className="result-section">
        <div className="section-heading">
          <h2>献立</h2>
          <div className="actions">
            {renderUpdateButton()}
            <button className="primary" disabled={pending} onClick={() => void save()} type="button">
              {pending ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
        {message && <p className="success">{message}</p>}
        {error && <p className="message">{error}</p>}
        <div className="grid">
          {days.map((day) => (
            <section className="meal-card" key={day.date}>
              <h3>{day.date}</h3>
              <div className="meal-day">
                {day.meals.map((meal, index) => (
                  <div key={`${day.date}-${meal.type ?? meal.mealType}-${index}`}>
                    <span className="badge">{mealLabels[meal.type ?? meal.mealType ?? ""] ?? meal.type}</span>
                    <EditableDishes dishes={meal.main ?? []} dishEdits={dishEdits} label="主菜" updateDish={updateDish} />
                    <EditableDishes dishes={meal.sides ?? []} dishEdits={dishEdits} label="副菜" updateDish={updateDish} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="actions section-bottom-actions">{renderUpdateButton()}</div>
      </section>

      <section className="result-section">
        <h2>食材リスト</h2>
        <ShoppingListView items={items} shoppingListId={shoppingListId} />
      </section>
    </>
  );
}

function EditableDishes({
  dishes,
  dishEdits,
  label,
  updateDish,
}: {
  dishes: Dish[];
  dishEdits: Record<string, DishEdit>;
  label: string;
  updateDish: (key: string, patch: Partial<DishEdit>) => void;
}) {
  if (dishes.length === 0) return null;

  return (
    <>
      <p className="label">{label}</p>
      <div className="editable-dish-list">
        {dishes.map((dish) => {
          const key = dishKey(dish);
          const edit = dishEdits[key] ?? { name: dish.name, ingredientsText: dish.description ?? "", servingSize: 1 };
          const previewDish = { ...dish, name: edit.name };
          return (
            <div className="editable-dish" key={key}>
              <strong className="dish-title">{edit.name}</strong>
              <div className="recipe-links">
                {linksFor(previewDish).map((link) => (
                  <a href={link.searchUrl} key={link.serviceName} rel="noreferrer" target="_blank">
                    {link.serviceName}で検索
                  </a>
                ))}
              </div>
              {edit.ingredientsText && <pre className="ingredient-text">{edit.ingredientsText}</pre>}
              <details className="dish-editor-panel">
                <summary>編集</summary>
                <label className="field">
                  料理名
                  <input onChange={(event) => updateDish(key, { name: event.currentTarget.value })} value={edit.name} />
                </label>
                <label className="field">
                  貼り付けた材料の人数
                  <input
                    min={1}
                    onChange={(event) => updateDish(key, { servingSize: Number(event.currentTarget.value) || 1 })}
                    type="number"
                    value={edit.servingSize}
                  />
                </label>
                <label className="field">
                  材料貼り付け欄
                  <textarea
                    onChange={(event) => updateDish(key, { ingredientsText: event.currentTarget.value })}
                    placeholder="クックパッドやクラシルの材料を貼り付け、必要に応じて手動編集できます。"
                    rows={5}
                    value={edit.ingredientsText}
                  />
                </label>
              </details>
            </div>
          );
        })}
      </div>
    </>
  );
}
