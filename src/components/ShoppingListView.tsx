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

const categoryOrder = [
  "肉類",
  "魚介類",
  "卵類",
  "野菜",
  "きのこ類",
  "豆類・豆製品",
  "海藻類",
  "種実類",
  "果物",
];

function normalizeCategory(item: Item) {
  const category = item.category;
  const name = item.name;

  if (category === "肉類" || category === "肉・魚") {
    if (/[魚鮭鯖さばサバまぐろツナえび海老いかイカたこタコ貝]/.test(name)) return "魚介類";
    return "肉類";
  }
  if (category === "魚介類") return "魚介類";
  if (category === "大豆・卵") {
    if (name.includes("卵") || name.includes("玉子")) return "卵類";
    return "豆類・豆製品";
  }
  if (category === "卵類") return "卵類";
  if (category === "豆類・豆製品") return "豆類・豆製品";
  if (category === "乾物" && /わかめ|昆布|ひじき|海苔|のり/.test(name)) return "海藻類";
  if (category === "海藻類") return "海藻類";
  if (category === "野菜" && /きのこ|しめじ|えのき|しいたけ|椎茸|まいたけ|エリンギ/.test(name)) return "きのこ類";
  if (category === "きのこ類") return "きのこ類";
  if (category === "種実類") return "種実類";
  if (category === "果物") return "果物";
  if (category === "野菜") return "野菜";
  return category;
}

function compareCategories(a: string, b: string) {
  const aIndex = categoryOrder.indexOf(a);
  const bIndex = categoryOrder.indexOf(b);
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  return a.localeCompare(b, "ja");
}

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
    const category = normalizeCategory(item);
    acc[category] ??= [];
    acc[category].push(item);
    return acc;
  }, {});
  const sortedGroups = Object.entries(groups).sort(([a], [b]) => compareCategories(a, b));

  return (
    <>
      {error && <p className="message">{error}</p>}
      <div className="grid">
        {sortedGroups.map(([category, categoryItems]) => (
          <section className="shopping-section" key={category}>
            <h3>{category}</h3>
            {categoryItems.toSorted((a, b) => a.name.localeCompare(b.name, "ja")).map((item) => {
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
