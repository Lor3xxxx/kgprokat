import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { formatSom, SHOP } from "@/lib/config";
import PublicHeader from "./components/PublicHeader";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string; page?: string }>;
}) {
  const { cat, q, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const browseCategories = !cat && !q;
  const totalCount = await prisma.equipment.count();
  const tickerCats = await prisma.category.findMany({
    where: { equipment: { some: {} } },
    orderBy: { equipment: { _count: "desc" } },
    take: 12,
    select: { name: true },
  });

  return (
    <>
      <PublicHeader />

      {/* HERO */}
      <section className="hero-bg grain relative overflow-hidden text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-6 right-2 select-none font-display text-[34vw] font-bold leading-none text-white/[0.035] sm:text-[22vw]"
        >
          KP
        </div>
        {/* Диагональный красный акцент */}
        <div aria-hidden className="pointer-events-none absolute -top-10 right-[12%] hidden h-[140%] gap-4 sm:flex">
          <div className="w-3 -skew-x-12 bg-brand/20" />
          <div className="w-2 -skew-x-12 bg-brand/12" />
          <div className="w-1.5 -skew-x-12 bg-brand/[0.06]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="rise max-w-3xl">
            <div className="kicker text-xs text-brand">KYRGYZ PROKAT · Бишкек</div>
            <h1 className="mt-4 text-4xl font-bold uppercase leading-[0.95] sm:text-6xl">
              Профессиональный<br />
              <span className="text-brand">инструмент</span> в аренду
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/60 sm:text-lg">
              Перфораторы, отбойники, генераторы, бетономешалки — {totalCount} позиций для стройки и ремонта.
              Бронируйте онлайн, подтверждаем в WhatsApp.
            </p>

            {/* Поиск */}
            <form action="/" className="mt-8 flex max-w-xl overflow-hidden rounded-none border border-white/15 bg-white/5 backdrop-blur">
              <input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Что нужно для работы?"
                className="flex-1 bg-transparent px-5 py-4 text-white placeholder:text-white/40 focus:outline-none"
              />
              <button className="bg-brand px-7 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-brand-dark">
                Найти
              </button>
            </form>
          </div>

          {/* Trust-блок */}
          <div className="rise mt-12 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-none border border-white/10 bg-white/5 sm:grid-cols-4" style={{ animationDelay: "0.15s" }}>
            {[
              [`${totalCount}`, "позиций в каталоге"],
              ["от 1", "суток аренды"],
              ["WhatsApp", "бронь за минуту"],
              ["Бишкек", "Куттубаева 26А/3"],
            ].map(([big, small]) => (
              <div key={small} className="bg-ink/40 px-5 py-5">
                <div className="font-display text-2xl font-bold text-white">{big}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-white/45">{small}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Ticker items={tickerCats.map((c) => c.name)} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        {browseCategories ? <Categories /> : <Products cat={cat} q={q} pageNum={pageNum} />}
      </main>

      <SiteFooter />
    </>
  );
}

// --- Плитки категорий ---
async function Categories() {
  const cats = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { equipment: true } },
      equipment: { where: { photo: { not: null } }, take: 1, select: { photo: true } },
    },
  });
  const tiles = cats
    .filter((c) => c._count.equipment > 0)
    .map((c) => ({ name: c.name, slug: c.slug, count: c._count.equipment, photo: c.equipment[0]?.photo ?? null }));

  return (
    <>
      <SectionHead kicker="Каталог" title="Категории оборудования" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <Link key={t.slug} href={`/?cat=${t.slug}`} className="reveal group relative block aspect-[4/5] overflow-hidden bg-ink">
            {t.photo ? (
              <Image
                src={t.photo}
                alt={t.name}
                fill
                sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                className="object-cover opacity-90 transition duration-500 group-hover:scale-110 group-hover:opacity-100"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-5xl">🛠️</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

            {/* Индекс */}
            <div className="absolute left-3 top-3 font-display text-xs font-bold tracking-widest text-white/40">
              {String(i + 1).padStart(2, "0")}
            </div>
            {/* Стрелка (появляется на ховере) */}
            <div className="absolute right-3 top-3 grid h-8 w-8 -translate-y-1 place-items-center bg-brand text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              ↗
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="h-0.5 w-8 bg-brand transition-all duration-300 group-hover:w-16" />
              <div className="mt-2 font-display text-base font-semibold uppercase leading-tight tracking-wide text-white">{t.name}</div>
              <div className="text-xs text-white/55">{t.count} позиций</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

// --- Список товаров ---
async function Products({ cat, q, pageNum }: { cat?: string; q?: string; pageNum: number }) {
  const where = {
    ...(cat ? { category: { slug: cat } } : {}),
    ...(q ? { name: { contains: q } } : {}),
  };
  const total = await prisma.equipment.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const equipment = await prisma.equipment.findMany({
    where,
    include: { category: true, units: true },
    orderBy: { name: "asc" },
    skip: (pageNum - 1) * PER_PAGE,
    take: PER_PAGE,
  });
  const activeCat = cat ? await prisma.category.findUnique({ where: { slug: cat } }) : null;

  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (cat) p.set("cat", cat);
    if (q) p.set("q", q);
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <Link href="/" className="kicker text-xs text-brand hover:text-brand-dark">← Все категории</Link>
      <div className="mt-2">
        <SectionHead
          kicker={`${total} позиций`}
          title={activeCat ? activeCat.name : `Поиск: «${q}»`}
        />
      </div>

      {equipment.length === 0 ? (
        <p className="text-gray-500">Ничего не найдено.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {equipment.map((e) => {
            const available = e.units.some((u) => u.status === "FREE");
            return (
              <Link
                key={e.id}
                href={`/equipment/${e.slug}`}
                className="reveal group flex flex-col overflow-hidden border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.35)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-paper">
                  {e.photo ? (
                    <Image
                      src={e.photo}
                      alt={e.name}
                      fill
                      sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-3xl">🛠️</div>
                  )}
                  <span className={`absolute left-2 top-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${available ? "bg-ink text-white" : "bg-white/90 text-gray-500"}`}>
                    {available ? "в наличии" : "под заказ"}
                  </span>
                  <div className="absolute bottom-2 right-2 grid h-8 w-8 translate-y-2 place-items-center bg-brand text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    →
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <div className="kicker line-clamp-1 text-[9px] text-brand">{e.category.name}</div>
                  <div className="mt-1 flex-1 font-display text-sm font-semibold leading-snug line-clamp-2">{e.name}</div>
                  <div className="mt-2 border-t border-line pt-2">
                    <span className="text-[11px] text-gray-400">от </span>
                    <span className="font-display text-lg font-bold">{formatSom(e.pricePerDay)}</span>
                    <span className="text-[11px] text-gray-400"> /сут</span>
                    <div className="text-[11px] text-gray-400">{formatSom(e.pricePerWeek)} / нед.</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          {pageNum > 1 && (
            <Link href={pageHref(pageNum - 1)} className="border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink/30">← Назад</Link>
          )}
          <span className="text-sm text-gray-500">Стр. {pageNum} из {totalPages}</span>
          {pageNum < totalPages && (
            <Link href={pageHref(pageNum + 1)} className="border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink/30">Вперёд →</Link>
          )}
        </div>
      )}
    </>
  );
}

function Ticker({ items }: { items: string[] }) {
  if (!items.length) return null;
  const row = [...items, ...items]; // дублируем для бесшовной прокрутки
  return (
    <div className="marquee relative overflow-hidden border-y border-white/10 bg-ink py-3">
      <div className="marquee-track">
        {row.map((name, i) => (
          <span key={i} className="flex items-center">
            <span className="whitespace-nowrap px-6 font-display text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              {name}
            </span>
            <span className="text-brand">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="kicker text-xs text-brand">{kicker}</div>
      <h2 className="mt-1 text-3xl font-bold uppercase">{title}</h2>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="hero-bg grain relative mt-8 text-white">
      <div className="relative mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center bg-brand font-display text-lg font-bold">KP</div>
              <div className="font-display text-xl font-bold tracking-wide">{SHOP.name}</div>
            </div>
            <p className="mt-3 text-sm text-white/50">{SHOP.tagline}</p>
          </div>
          <div>
            <div className="kicker text-xs text-white/40">Контакты</div>
            <div className="mt-3 space-y-1 text-sm text-white/70">
              {SHOP.phones.map((p) => (
                <a key={p} href={`tel:${p}`} className="block hover:text-white">{p}</a>
              ))}
              <div className="text-white/50">{SHOP.address}</div>
            </div>
          </div>
          <div>
            <div className="kicker text-xs text-white/40">Режим работы</div>
            <p className="mt-3 text-sm text-white/70">{SHOP.hours}</p>
            <a
              href={`https://wa.me/${SHOP.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex bg-brand px-5 py-2.5 text-sm font-bold transition hover:bg-brand-dark"
            >
              Написать в WhatsApp
            </a>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/30">
          © {SHOP.name}. Аренда строительного оборудования в Бишкеке.
        </div>
      </div>
    </footer>
  );
}
