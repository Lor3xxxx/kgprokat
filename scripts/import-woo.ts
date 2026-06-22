// Импорт реального каталога с kyrgyzprokat.kg (WooCommerce Store API).
// Берём: название, фото (скачиваем локально), категорию.
// Цена за сутки и залог — РЕАЛЬНЫЕ значения с их сайта: из вариаций товара
// «Сутки до 24 часов» (цена/сутки) и «Залог» (залог). «Стоимость» — это ценность
// оборудования, НЕ цена аренды. Цена за неделю — наш дефлот (сутки×5).
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DIR = path.join(process.cwd(), ".import");
const IMG_DIR = path.join(process.cwd(), "public", "equipment");
const COOKIE = "beget=begetok";

function slugify(s: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", " ": "-",
  };
  return s.toLowerCase().split("").map((ch) => (ch in map ? map[ch] : /[a-z0-9-]/.test(ch) ? ch : "")).join("")
    .replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function stripHtml(s: string): string {
  return (s || "").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().slice(0, 280);
}

// Категории: резолвим верхнеуровневого предка
const cats: { id: number; name: string; parent: number }[] = JSON.parse(fs.readFileSync(path.join(DIR, "cats.json"), "utf8"));
const catMap = new Map(cats.map((c) => [c.id, c]));
function topCategory(id: number): string | null {
  let cur = catMap.get(id);
  if (!cur) return null;
  const seen = new Set<number>();
  while (cur && cur.parent !== 0 && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = catMap.get(cur.parent);
  }
  return cur ? cur.name : null;
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) return true; // уже скачано
  try {
    const res = await fetch(url, { headers: { Cookie: COOKIE, "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return false; // отбрасываем заглушки/ошибки
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

// Классификация термина вариации «Срок аренды» по его slug/названию
function classifyTerm(termSlug: string): "day" | "halfday" | "deposit" | "value" | "other" {
  let t = termSlug;
  try { t = decodeURIComponent(termSlug); } catch { /* оставляем как есть */ }
  t = t.toLowerCase();
  if (t.includes("залог")) return "deposit";
  if (t.includes("сутки")) return "day"; // сутки-до-24-часов
  if (t.includes("день")) return "halfday"; // день-до-12-часов
  if (t.includes("стоимост")) return "value";
  return "other";
}

// Парсим цены вариаций со страницы товара (data-product_variations)
async function fetchVariationPrices(permalink: string): Promise<{ day?: number; halfday?: number; deposit?: number }> {
  try {
    const res = await fetch(permalink, { headers: { Cookie: COOKIE, "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return {};
    const h = await res.text();
    const m = h.match(/data-product_variations="([^"]*)"/);
    if (!m) return {};
    const j = m[1].replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&amp;/g, "&");
    const variations = JSON.parse(j) as { attributes: Record<string, string>; display_price: number }[];
    const out: { day?: number; halfday?: number; deposit?: number } = {};
    for (const v of variations) {
      const term = Object.values(v.attributes || {})[0] || "";
      const cls = classifyTerm(term);
      const price = Number(v.display_price);
      if (Number.isNaN(price)) continue;
      if (cls === "day") out.day = price;
      else if (cls === "halfday") out.halfday = price;
      else if (cls === "deposit") out.deposit = price;
    }
    return out;
  } catch {
    return {};
  }
}

async function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });

  // Собираем все товары
  const products: any[] = [];
  for (const f of ["prods_1.json", "prods_2.json", "prods_3.json"]) {
    products.push(...JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
  }
  console.log("Товаров получено:", products.length);

  // Очистка каталога (клиентов, пользователей и настройки сохраняем)
  await prisma.rental.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.category.deleteMany();

  // Категории
  const catByName = new Map<string, number>();
  async function ensureCategory(name: string): Promise<number> {
    if (catByName.has(name)) return catByName.get(name)!;
    let slug = slugify(name);
    const existing = await prisma.category.findFirst({ where: { slug } });
    if (existing) slug = `${slug}-${existing.id}`;
    const c = await prisma.category.create({ data: { name, slug } });
    catByName.set(name, c.id);
    return c.id;
  }

  const usedSlugs = new Set<string>();
  let imgOk = 0, imgFail = 0, created = 0;

  interface Rec {
    name: string; slug: string; catName: string;
    pricePerDay: number; pricePerWeek: number; baseDeposit: number;
    description: string; photo: string | null;
    permalink: string; fallbackDay: number;
    imgUrl?: string; dest?: string; localPath?: string;
  }
  const records: Rec[] = [];

  for (const p of products) {
    const name: string = (p.name || "").trim();
    if (!name) continue;

    // slug
    let slug = slugify(name) || `pos-${p.id}`;
    let s = slug, n = 2;
    while (usedSlugs.has(s)) s = `${slug}-${n++}`;
    slug = s;
    usedSlugs.add(slug);

    // категория
    let catName: string | null = null;
    for (const c of p.categories || []) {
      const t = topCategory(c.id);
      if (t) { catName = t; break; }
    }
    if (!catName) catName = "Разное";

    // Запасная цена за сутки — минимум из диапазона (точные цены берём скрейпом ниже)
    const pr = p.prices || {};
    const fallbackDay = Math.max(0, parseInt(String(pr.price_range?.min_amount ?? pr.price ?? "0"), 10) || 0);

    const rec: Rec = {
      name, slug, catName,
      pricePerDay: fallbackDay, pricePerWeek: 0, baseDeposit: 0,
      description: stripHtml(p.short_description || p.description), photo: null,
      permalink: p.permalink, fallbackDay,
    };

    // фото
    const imgUrl: string | undefined = p.images?.[0]?.src;
    if (imgUrl) {
      const ext = (imgUrl.split(".").pop() || "jpg").split(/[?#]/)[0].toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
      const fileName = `${slug}.${safeExt}`;
      rec.imgUrl = imgUrl;
      rec.dest = path.join(IMG_DIR, fileName);
      rec.localPath = `/equipment/${fileName}`;
    }
    records.push(rec);
  }

  // Скрейп реальных цен вариаций (сутки + залог) пулом по 10
  const POOL = 10;
  console.log("Получаю реальные цены вариаций:", records.length);
  let priced = 0;
  for (let i = 0; i < records.length; i += POOL) {
    await Promise.all(records.slice(i, i + POOL).map(async (r) => {
      const vp = await fetchVariationPrices(r.permalink);
      const day = vp.day ?? vp.halfday ?? r.fallbackDay;
      r.pricePerDay = Math.max(0, Math.round(day || 0));
      r.pricePerWeek = Math.round((r.pricePerDay * 5) / 50) * 50; // наш дефолт ~ -30%
      r.baseDeposit = vp.deposit && vp.deposit > 0
        ? Math.round(vp.deposit) // реальный залог с их сайта
        : Math.max(2000, Math.round((r.pricePerDay * 6) / 1000) * 1000); // эвристика, если залога нет
      if (vp.day || vp.deposit) priced++;
    }));
    if (i % (POOL * 10) === 0) console.log(`  ...${Math.min(i + POOL, records.length)}/${records.length}`);
  }
  console.log(`Цены получены для ${priced}/${records.length} позиций`);

  // Скачивание изображений пулом по 10
  const withImg = records.filter((r) => r.imgUrl);
  console.log("Скачиваю изображения:", withImg.length);
  for (let i = 0; i < withImg.length; i += POOL) {
    const batch = withImg.slice(i, i + POOL);
    await Promise.all(batch.map(async (r) => {
      const ok = await downloadImage(r.imgUrl!, r.dest!);
      if (ok) { r.photo = r.localPath!; imgOk++; }
      else { r.photo = null; imgFail++; }
    }));
    if (i % (POOL * 5) === 0) console.log(`  ...${Math.min(i + POOL, withImg.length)}/${withImg.length}`);
  }
  console.log(`Изображения: ok=${imgOk}, fail=${imgFail}`);

  // Запись в БД
  for (const r of records) {
    const categoryId = await ensureCategory(r.catName);
    const eq = await prisma.equipment.create({
      data: {
        name: r.name, slug: r.slug, description: r.description || null,
        photo: r.photo, pricePerDay: r.pricePerDay, pricePerWeek: r.pricePerWeek,
        baseDeposit: r.baseDeposit, categoryId,
      },
    });
    // по 2 экземпляра на позицию
    await prisma.unit.createMany({
      data: [
        { equipmentId: eq.id, inventoryNo: `${r.slug}-1`, status: "FREE" },
        { equipmentId: eq.id, inventoryNo: `${r.slug}-2`, status: "FREE" },
      ],
    });
    created++;
  }

  console.log(`Создано позиций: ${created}, категорий: ${catByName.size}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
