type Item = {
  id?: string;
  name: string;
  amount?: string | null;
  unit?: string | null;
  category: string;
  checked?: boolean;
};

export function ShoppingListView({ items }: { items: Item[] }) {
  const groups = items.reduce<Record<string, Item[]>>((acc, item) => {
    acc[item.category] ??= [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="grid">
      {Object.entries(groups).map(([category, categoryItems]) => (
        <section className="shopping-section" key={category}>
          <h3>{category}</h3>
          {categoryItems.map((item) => (
            <label className="shopping-item" key={item.id ?? item.name}>
              <input type="checkbox" defaultChecked={item.checked} />
              <span>{item.name}</span>
              <span className="badge">
                {[item.amount, item.unit].filter(Boolean).join("") || "分量なし"}
              </span>
            </label>
          ))}
        </section>
      ))}
    </div>
  );
}
