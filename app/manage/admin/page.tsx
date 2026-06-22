import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { SHOP } from "@/lib/config";
import { updateSettingsAction, updateEquipmentPricingAction } from "./actions";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, cat, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);

  const s = await getSettings();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  // Фильтруем в памяти — поиск по кириллице без учёта регистра (SQLite contains регистрозависим)
  const all = await prisma.equipment.findMany({
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
  const ql = (q ?? "").trim().toLowerCase();
  const list = all.filter(
    (e) => (!ql || e.name.toLowerCase().includes(ql)) && (!cat || e.category.slug === cat),
  );
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const equipment = list.slice((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE);

  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat) p.set("cat", cat);
    if (n > 1) p.set("page", String(n));
    const str = p.toString();
    return str ? `/manage/admin?${str}` : "/manage/admin";
  };

  const field = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Правила аренды</h1>

      {/* Правила */}
      <form action={updateSettingsAction} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-gray-600">Минимальный срок аренды, суток</span>
            <input name="minRentalDays" type="number" min={1} defaultValue={s.minRentalDays} className={field} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Штраф за день просрочки, сом</span>
            <input name="finePerDay" type="number" min={0} defaultValue={s.finePerDay} className={field} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Недельный тариф применяется с N суток</span>
            <input name="weekThresholdDays" type="number" min={1} defaultValue={s.weekThresholdDays} className={field} />
          </label>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="mb-2 text-sm font-medium text-gray-700">Коэффициенты залога по уровням (множитель базового залога)</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm text-gray-600">🟢 Проверенный</span>
              <input name="depositVerified" type="number" step="0.05" min={0} defaultValue={s.depositVerified} className={field} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">⭐ Постоянный</span>
              <input name="depositRegular" type="number" step="0.05" min={0} defaultValue={s.depositRegular} className={field} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">🔴 Чёрный список</span>
              <input name="depositBlacklist" type="number" step="0.05" min={0} defaultValue={s.depositBlacklist} className={field} />
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            🟡 Новый клиент платит полный базовый залог (×1.0). Значение 0.5 = −50%, 0 = без залога.
          </p>
        </div>

        <button className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600">
          Сохранить правила
        </button>
      </form>

      {/* График работы (справочно) */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <div className="font-medium text-gray-700">График работы</div>
        {SHOP.hours}
      </div>

      {/* Цены и залоги по позициям */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Цены и залоги <span className="text-sm font-normal text-gray-400">({total} позиций)</span></h2>

        {/* Поиск и фильтр */}
        <form action="/manage/admin" className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input name="q" defaultValue={q ?? ""} placeholder="Поиск по названию…" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none" />
          <select name="cat" defaultValue={cat ?? ""} className="rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none sm:w-56">
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <button className="rounded-lg bg-gray-800 px-4 py-2 font-medium text-white hover:bg-gray-700">Найти</button>
          {(q || cat) && (
            <Link href="/manage/admin" className="rounded-lg border border-gray-300 px-4 py-2 text-center text-gray-600 hover:bg-gray-50">Сброс</Link>
          )}
        </form>

        {equipment.length === 0 ? (
          <p className="text-sm text-gray-500">Ничего не найдено.</p>
        ) : (
          <div className="space-y-2">
            {equipment.map((e) => (
              <form
                key={e.id}
                action={updateEquipmentPricingAction}
                className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm"
              >
                <input type="hidden" name="id" value={e.id} />
                <div className="min-w-[180px] flex-1">
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-gray-400">{e.category.name}</div>
                </div>
                <label className="block">
                  <span className="text-xs text-gray-500">Сутки</span>
                  <input name="pricePerDay" type="number" min={0} defaultValue={e.pricePerDay} className="mt-1 w-28 rounded-lg border border-gray-300 px-2 py-1.5" />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Неделя</span>
                  <input name="pricePerWeek" type="number" min={0} defaultValue={e.pricePerWeek} className="mt-1 w-28 rounded-lg border border-gray-300 px-2 py-1.5" />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Залог</span>
                  <input name="baseDeposit" type="number" min={0} defaultValue={e.baseDeposit} className="mt-1 w-28 rounded-lg border border-gray-300 px-2 py-1.5" />
                </label>
                <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50">
                  Сохранить
                </button>
              </form>
            ))}
          </div>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            {pageNum > 1 && (
              <Link href={pageHref(pageNum - 1)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:border-gray-400">← Назад</Link>
            )}
            <span className="text-sm text-gray-500">Стр. {pageNum} из {totalPages}</span>
            {pageNum < totalPages && (
              <Link href={pageHref(pageNum + 1)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:border-gray-400">Вперёд →</Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
