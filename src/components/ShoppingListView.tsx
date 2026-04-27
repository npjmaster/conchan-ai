"use client";

import { useState } from "react";

type Item = {
  id?: string;
  name: string;
  amount?: string | null;
  unit?: string | null;
  category: string;
  checked?: boolean;
};

export function ShoppingListView({
  items,
  shoppingListId,
}: {
  items: Item[];
  shoppingListId?: string;
}) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.id ?? item.name, Boolean(item.checked)])),
  );
  const [error, setError] = useState("");

  async function onCheck(item: Item, checked: boolean) {
    const key = item.id ?? item.name;
    setCheckedItems((current) => ({ ...current, [key]: checked }));
    setError("");

    if (!item.id || !shoppingListId) return;

    try {
      const response = await fetch(`/api/shopping-lists/${shoppingListId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, checked }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存に失敗しました。");
    } catch (err) {
      setCheckedItems((current) => ({ ...current, [key]: !checked }));
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    }
  }

  const groups = items.reduce<Record<string, Item[]>>((acc, item) => {
    acc[item.category] ??= [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <>
      {error && <p className="message">{error}</p>}
      <div className="grid">
        {Object.entries(groups).map(([category, categoryItems]) => (
          <section className="shopping-section" key={category}>
            <h3>{category}</h3>
            {categoryItems.map((item) => {
              const key = item.id ?? item.name;
              return (
                <label className="shopping-item" key={key}>
                  <input
                    checked={checkedItems[key] ?? false}
                    onChange={(event) => void onCheck(item, event.currentTarget.checked)}
                    type="checkbox"
                  />
                  <span>{item.name}</span>
                  <span className="badge">
                    {[item.amount, item.unit].filter(Boolean).join("") || "分量なし"}
                  </span>
                </label>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}
