"use client";

import { useEffect, useState } from "react";
import { normalizeShoppingCategory } from "@/lib/ingredients";

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
  "豆腐・豆製品",
  "海藻類",
  "米・麺",
  "果物",
  "種実類",
  "油",
  "粉類",
  "その他",
  "調味料",
];

function normalizeCategory(item: Item) {
  return normalizeShoppingCategory({ name: item.name, category: item.category });
}

function compareCategories(a: string, b: string) {
  if (a === "調味料" && b !== "調味料") return 1;
  if (b === "調味料" && a !== "調味料") return -1;

  const aIndex = categoryOrder.indexOf(a);
  const bIndex = categoryOrder.indexOf(b);
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  return a.localeCompare(b, "ja");
}

function displayAmount(item: Item) {
  if (["油", "粉類", "調味料"].includes(normalizeCategory(item))) return "";
  return [item.amount, item.unit].filter(Boolean).join("");
}

function displayName(item: Item) {
  if (normalizeCategory(item) === "油" && item.name === "油") return "オリーブオイル";
  return item.name;
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

  useEffect(() => {
    setCheckedItems(Object.fromEntries(items.map((item) => [item.id ?? item.name, Boolean(item.checked)])));
  }, [items]);

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
  const sortedItems = sortedGroups.flatMap(([category, categoryItems]) =>
    categoryItems
      .toSorted((a, b) => a.name.localeCompare(b.name, "ja"))
      .map((item) => ({ ...item, name: displayName({ ...item, category }), category, amount: displayAmount({ ...item, category }), unit: "" })),
  );

  function exportFile(format: "csv" | "txt") {
    const content =
      format === "csv"
        ? [
            "category,name,amount,unit",
            ...sortedItems.map((item) =>
              [item.category, item.name, item.amount ?? "", item.unit ?? ""]
                .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                .join(","),
            ),
          ].join("\n")
        : sortedItems
            .map((item) => [item.category, item.name, [item.amount, item.unit].filter(Boolean).join("")].filter(Boolean).join("\t"))
            .join("\n");
    const blob = new Blob([format === "csv" ? `\uFEFF${content}` : content], {
      type: format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shopping-list.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {error && <p className="message">{error}</p>}
      <div className="actions export-actions">
        <button onClick={() => exportFile("csv")} type="button">
          CSV出力
        </button>
        <button onClick={() => exportFile("txt")} type="button">
          TXT出力
        </button>
      </div>
      <div className="grid">
        {sortedGroups.map(([category, categoryItems]) => (
          <section className="shopping-section" key={category}>
            <h3>{category}</h3>
            {categoryItems.toSorted((a, b) => a.name.localeCompare(b.name, "ja")).map((item) => {
              const key = item.id ?? item.name;
              const amount = displayAmount({ ...item, category });
              return (
                <label className="shopping-item" key={key}>
                  <input
                    checked={checkedItems[key] ?? false}
                    onChange={(event) => void onCheck(item, event.currentTarget.checked)}
                    type="checkbox"
                  />
                  <span>{displayName({ ...item, category })}</span>
                  <span className="badge">{amount || "分量なし"}</span>
                </label>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}
