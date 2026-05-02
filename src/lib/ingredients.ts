import type { ShoppingItem } from "./types";

const defaultCategory = "その他";
const condimentCategory = "調味料";
const oilCategory = "油";
const powderCategory = "粉類";
const tofuCategory = "豆腐・豆製品";

const noAmountCategories = new Set([condimentCategory, oilCategory, powderCategory]);

const powderNames = ["小麦粉", "薄力粉", "強力粉", "中力粉", "片栗粉", "米粉", "パン粉", "天ぷら粉", "お好み焼き粉", "ホットケーキミックス", "粉チーズ"];
const oilNames = ["油", "サラダ油", "ごま油", "オリーブオイル", "米油", "菜種油", "揚げ油"];
const condimentNames = [
  "しょうゆ",
  "醤油",
  "みりん",
  "味噌",
  "砂糖",
  "塩",
  "こしょう",
  "胡椒",
  "酢",
  "酒",
  "料理酒",
  "だし",
  "ソース",
  "ケチャップ",
  "マヨネーズ",
  "めんつゆ",
  "白だし",
  "コンソメ",
  "鶏ガラスープ",
  "かつお節",
  "鰹節",
];

const countUnits = ["個", "本", "枚", "束", "袋", "パック", "缶", "丁", "玉", "合", "片", "切れ", "尾", "杯", "株", "房"];
const weightUnits = ["g", "kg", "ml", "cc", "L"];

export function ingredientTextFromItems(items?: ShoppingItem[] | null) {
  return formatIngredientText(items ?? []);
}

export function formatIngredientText(items: ShoppingItem[]) {
  return items
    .map((item) => [item.name, [item.amount, item.unit].filter(Boolean).join("")].filter(Boolean).join(" "))
    .join("\n");
}

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[•●・]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanIngredientName(value: string) {
  const text = normalizeText(value)
    .replace(/[(（]\s*[A-ZＡ-Ｚ]\s*[)）]/g, "")
    .replace(/[(（]\s*代用\s*OK\s*[)）]/gi, "")
    .replace(/代用\s*OK/gi, "")
    .replace(/代用可/g, "")
    .trim();
  if (text === "油" && /オリーブオイル/.test(value)) return "オリーブオイル";
  return text;
}

function isNoise(value: string) {
  const text = normalizeText(value);
  return (
    !text ||
    /^[(（]?[A-ZＡ-Ｚ][)）]?$/.test(text) ||
    /^代用\s*OK$/i.test(text) ||
    /^代用可$/.test(text) ||
    /^材料$/.test(text) ||
    /^\d+\s*人分$/.test(text) ||
    /^作り方$/.test(text) ||
    /^下準備$/.test(text) ||
    /^ポイント$/.test(text)
  );
}

export function normalizeShoppingCategory(item: Pick<ShoppingItem, "name" | "category">) {
  const name = item.name ?? "";
  const category = item.category || defaultCategory;

  if (oilNames.some((keyword) => name.includes(keyword)) || category === oilCategory) return oilCategory;
  if (powderNames.some((keyword) => name.includes(keyword)) || category === powderCategory) return powderCategory;
  if (condimentNames.some((keyword) => name.includes(keyword)) || category.includes("調味")) return condimentCategory;
  if (name.includes("豆腐") || category === "豆腐" || category === "豆・豆製品" || category === tofuCategory) return tofuCategory;
  if (category === "肉" || category === "肉類") return "肉類";
  if (category === "魚" || category === "魚介" || category === "魚介類") return "魚介類";
  if (category === "卵" || category === "卵類") return "卵類";
  if (category === "野菜") return "野菜";
  if (category === "きのこ" || category === "きのこ類") return "きのこ類";
  if (category === "海藻" || category === "海藻類") return "海藻類";
  if (category === "米・麺" || category === "米・麺類") return "米・麺";
  if (category === "果物" || category === "果物類") return "果物";
  if (category === "種実" || category === "種実類" || category === "ナッツ" || category === "ナッツ類") return "種実類";
  return category || defaultCategory;
}

function parseNumber(value: string) {
  const text = value.normalize("NFKC").replace(/／/g, "/").replace(/半/g, "1/2").trim();
  const mixed = text.match(/^(\d+)\s*(?:と|\+)?\s*(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function formatNumber(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}

function splitIngredientAndQuantity(lines: string[]) {
  const result: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const current = normalizeText(lines[index]);
    const next = normalizeText(lines[index + 1] ?? "");
    if (!current || isNoise(current) || looksLikeQuantity(current)) continue;
    if (next && looksLikeQuantity(next)) {
      result.push(`${current} ${next}`);
      index += 1;
      continue;
    }
    result.push(current);
  }
  return result;
}

function looksLikeQuantity(value: string) {
  const units = [...countUnits, ...weightUnits, "カップ"].join("|");
  const text = normalizeText(value);
  return new RegExp(`^(約)?([0-9.\\/]+|半|適量|少々|お好みで|適宜|大さじ\\s*[0-9.\\/]+|小さじ\\s*[0-9.\\/]+|[0-9.\\/]+\\s*(${units}))(\\s*[(（].+[)）])?$`, "i").test(text);
}

function scaleParenthetical(text: string, scale: number) {
  return text.replace(/([0-9.\/]+)\s*(g|kg|ml|cc|L)/gi, (match, numberText: string, unit: string) => {
    const parsed = parseNumber(numberText);
    if (parsed === undefined) return match;
    return `${formatNumber(parsed * scale)}${unit}`;
  });
}

function quantityToParts(quantity: string, scale: number) {
  const normalized = normalizeText(quantity).replace(/約/g, "").replace(/半/g, "1/2").trim();
  if (["適量", "少々", "お好みで", "適宜"].includes(normalized)) return {};

  const spoon = normalized.match(/^(大さじ|小さじ)\s*([0-9.\/]+)$/);
  if (spoon) {
    const amount = parseNumber(spoon[2]);
    return { amount: amount === undefined ? spoon[2] : formatNumber(amount * scale), unit: spoon[1] };
  }

  const parenthetical = normalized.match(/^([0-9.\/]+)\s*([^()（）0-9]+)\s*([(（].+[)）])$/);
  if (parenthetical) {
    const amount = parseNumber(parenthetical[1]);
    return {
      amount: amount === undefined ? parenthetical[1] : formatNumber(amount * scale),
      unit: `${parenthetical[2]}${scaleParenthetical(parenthetical[3], scale)}`,
    };
  }

  const compact = normalized.match(/^([0-9.\/]+)\s*(.+)$/);
  if (compact) {
    const amount = parseNumber(compact[1]);
    return {
      amount: amount === undefined ? compact[1] : formatNumber(amount * scale),
      unit: scaleParenthetical(compact[2].trim(), scale),
    };
  }

  const plain = parseNumber(normalized);
  if (plain !== undefined) return { amount: formatNumber(plain * scale) };
  return { amount: scaleParenthetical(normalized, scale) };
}

function normalizeItem(item: ShoppingItem, scale = 1): ShoppingItem {
  const rawName = cleanIngredientName(item.name);
  const name = rawName === "油" && item.category === oilCategory ? "オリーブオイル" : rawName;
  const category = normalizeShoppingCategory({ name, category: item.category });
  if (noAmountCategories.has(category)) return { name, category };

  const amountNumber = item.amount ? parseNumber(item.amount) : undefined;
  if (amountNumber !== undefined) {
    return {
      ...item,
      name,
      category,
      amount: formatNumber(amountNumber * scale),
      unit: item.unit ? scaleParenthetical(item.unit, scale) : item.unit,
    };
  }

  return {
    ...item,
    name,
    category,
    amount: item.amount ? scaleParenthetical(item.amount, scale) : item.amount,
    unit: item.unit ? scaleParenthetical(item.unit, scale) : item.unit,
  };
}

export function parseIngredientText(text: string, scale = 1): ShoppingItem[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  return splitIngredientAndQuantity(lines)
    .map((line) => {
      const cleaned = normalizeText(line.replace(/^[\-*]/, ""));
      const match = cleaned.match(/^(.+?)\s+(.+)$/);
      if (!match) return { name: cleanIngredientName(cleaned), category: defaultCategory };
      const quantity = match[2].trim();
      if (!looksLikeQuantity(quantity)) return { name: cleanIngredientName(cleaned), category: defaultCategory };
      return { name: cleanIngredientName(match[1]), ...quantityToParts(quantity, scale), category: defaultCategory };
    })
    .filter((item) => item.name && !isNoise(item.name))
    .map((item) => normalizeItem(item));
}

function aggregateAmounts(current: ShoppingItem, incoming: ShoppingItem) {
  const a = current.amount ? parseNumber(current.amount) : undefined;
  const b = incoming.amount ? parseNumber(incoming.amount) : undefined;
  if (a === undefined || b === undefined) return current;
  if ((current.unit ?? "") !== (incoming.unit ?? "")) return current;
  return { ...current, amount: formatNumber(a + b) };
}

export function aggregateShoppingItems(items: ShoppingItem[]) {
  const merged = new Map<string, ShoppingItem>();
  for (const rawItem of items) {
    const item = normalizeItem(rawItem);
    const key = `${item.category}:${item.name}:${item.unit ?? ""}`;
    const current = merged.get(key);
    merged.set(key, current ? aggregateAmounts(current, item) : item);
  }
  return Array.from(merged.values());
}

export function scaleShoppingItems(items: ShoppingItem[], scale: number) {
  return items.map((item) => normalizeItem(item, scale));
}
