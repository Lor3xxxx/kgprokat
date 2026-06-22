import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatSom } from "@/lib/config";

export const dynamic = "force-dynamic";

type PeriodKey = "today" | "7d" | "30d" | "all";
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Сегодня" },
  { key: "7d", label: "7 дней" },
  { key: "30d", label: "30 дней" },
  { key: "all", label: "Всё время" },
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function periodStart(key: PeriodKey, now: Date): Date {
  if (key === "today") return startOfDay(now);
  if (key === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (key === "30d") return new Date(now.getTime() - 30 * 86400000);
  return new Date(0);
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireAdmin();
  const { period } = await searchParams;
  const sel: PeriodKey = (["today", "7d", "30d", "all"] as const).includes(period as PeriodKey)
    ? (period as PeriodKey)
    : "30d";

  const now = new Date();

  // Все аренды (кроме отменённых) с нужными связями — агрегируем в памяти
  const rentals = await prisma.rental.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      unit: { include: { equipment: { select: { name: true } } } },
      client: { select: { id: true, name: true, phone: true } },
    },
  });

  // KPI по периодам: число аренд + выручка
  const kpi = PERIODS.map((p) => {
    const from = periodStart(p.key, now).getTime();
    const inP = rentals.filter((r) => r.startDate.getTime() >= from);
    return {
      ...p,
      count: inP.length,
      revenue: inP.reduce((s, r) => s + r.rentalCost, 0),
    };
  });

  // Данные за выбранный период
  const from = periodStart(sel, now).getTime();
  const inSel = rentals.filter((r) => r.startDate.getTime() >= from);

  // По менеджерам
  const byManager = new Map<number, { name: string; role: string; count: number; revenue: number; fines: number }>();
  for (const r of inSel) {
    if (!r.createdBy) continue;
    const m = byManager.get(r.createdBy.id) ?? { name: r.createdBy.name, role: r.createdBy.role, count: 0, revenue: 0, fines: 0 };
    m.count++;
    m.revenue += r.rentalCost;
    m.fines += r.fine;
    byManager.set(r.createdBy.id, m);
  }
  const managers = [...byManager.values()].sort((a, b) => b.revenue - a.revenue);

  // Популярное оборудование
  const byEq = new Map<string, { count: number; revenue: number }>();
  for (const r of inSel) {
    const name = r.unit.equipment.name;
    const e = byEq.get(name) ?? { count: 0, revenue: 0 };
    e.count++;
    e.revenue += r.rentalCost;
    byEq.set(name, e);
  }
  const topEquipment = [...byEq.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10);

  // Текущее состояние
  const activeRentals = rentals.filter((r) => r.status === "ISSUED" || r.status === "OVERDUE");
  const depositsHeld = activeRentals.reduce((s, r) => s + r.deposit, 0);

  // Должники: активные аренды с истёкшим сроком
  const debtorsMap = new Map<number, { name: string; phone: string; count: number }>();
  for (const r of activeRentals) {
    if (r.dueDate.getTime() < now.getTime()) {
      const d = debtorsMap.get(r.client.id) ?? { name: r.client.name, phone: r.client.phone, count: 0 };
      d.count++;
      debtorsMap.set(r.client.id, d);
    }
  }
  const debtors = [...debtorsMap.entries()];

  const selRevenue = inSel.reduce((s, r) => s + r.rentalCost, 0);
  const selFines = inSel.reduce((s, r) => s + r.fine, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Аналитика</h1>

      {/* KPI: аренды и выручка по периодам */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpi.map((k) => (
          <div key={k.key} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className="mt-1 text-2xl font-bold">{k.count}</div>
            <div className="text-xs text-gray-500">аренд · {formatSom(k.revenue)}</div>
          </div>
        ))}
      </div>

      {/* Текущее состояние */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold">{activeRentals.length}</div>
          <div className="text-xs text-gray-500">активных аренд сейчас</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold">{formatSom(depositsHeld)}</div>
          <div className="text-xs text-gray-500">залогов на руках</div>
        </div>
        <div className={`rounded-xl border p-4 ${debtors.length ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
          <div className={`text-2xl font-bold ${debtors.length ? "text-red-700" : ""}`}>{debtors.length}</div>
          <div className="text-xs text-gray-500">должников (просрочка)</div>
        </div>
      </div>

      {/* Переключатель периода */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">Период для разбивки:</span>
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/manage/stats?period=${p.key}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              sel === p.key ? "bg-red-500 text-white border-red-500" : "bg-white border-gray-300 hover:border-red-400"
            }`}
          >
            {p.label}
          </Link>
        ))}
        <span className="ml-auto text-sm text-gray-500">
          Итого за период: <b>{inSel.length}</b> аренд · выручка <b>{formatSom(selRevenue)}</b> · штрафы {formatSom(selFines)}
        </span>
      </div>

      {/* По менеджерам */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">По менеджерам</h2>
        {managers.length === 0 ? (
          <p className="text-sm text-gray-500">Нет аренд за период.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Менеджер</th>
                  <th className="px-3 py-2 font-medium">Оформлено аренд</th>
                  <th className="px-3 py-2 font-medium">Выручка</th>
                  <th className="px-3 py-2 font-medium">Штрафы собрано</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((m, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">
                      {m.name} <span className="text-xs text-gray-400">({m.role === "ADMIN" ? "админ" : "менеджер"})</span>
                    </td>
                    <td className="px-3 py-2">{m.count}</td>
                    <td className="px-3 py-2">{formatSom(m.revenue)}</td>
                    <td className="px-3 py-2">{formatSom(m.fines)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Популярное оборудование */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Популярное оборудование</h2>
        {topEquipment.length === 0 ? (
          <p className="text-sm text-gray-500">Нет данных за период.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Оборудование</th>
                  <th className="px-3 py-2 font-medium">Выдач</th>
                  <th className="px-3 py-2 font-medium">Выручка</th>
                </tr>
              </thead>
              <tbody>
                {topEquipment.map(([name, e]) => (
                  <tr key={name} className="border-t border-gray-100">
                    <td className="px-3 py-2">{name}</td>
                    <td className="px-3 py-2">{e.count}</td>
                    <td className="px-3 py-2">{formatSom(e.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Должники */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-red-700">Должники (просрочка по активным арендам)</h2>
        {debtors.length === 0 ? (
          <p className="text-sm text-gray-500">Должников нет 👍</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-red-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-red-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Клиент</th>
                  <th className="px-3 py-2 font-medium">Телефон</th>
                  <th className="px-3 py-2 font-medium">Просроченных аренд</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map(([id, d]) => (
                  <tr key={id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <Link href={`/manage/clients/${id}`} className="font-medium hover:underline">{d.name}</Link>
                    </td>
                    <td className="px-3 py-2">{d.phone}</td>
                    <td className="px-3 py-2">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
