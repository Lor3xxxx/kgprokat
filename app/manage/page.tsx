import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatSom } from "@/lib/config";
import { levelOf } from "@/lib/queries";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default async function Dashboard() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowEnd = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);

  const active = await prisma.rental.findMany({
    where: { status: { in: ["ISSUED", "OVERDUE"] } },
    include: { client: { include: { rentals: true } }, unit: { include: { equipment: true } } },
    orderBy: { dueDate: "asc" },
  });

  const overdue = active.filter((r) => r.dueDate.getTime() < now.getTime());
  const dueSoon = active.filter(
    (r) => r.dueDate.getTime() >= now.getTime() && r.dueDate.getTime() < tomorrowEnd.getTime(),
  );

  const units = await prisma.unit.groupBy({ by: ["status"], _count: true });
  const unitCount = (s: string) => units.find((u) => u.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд</h1>

      {/* Сводка */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Активные аренды" value={active.length} />
        <Stat label="Просрочки" value={overdue.length} danger={overdue.length > 0} />
        <Stat label="Свободно" value={unitCount("FREE")} />
        <Stat label="На обслуживании" value={unitCount("SERVICE")} />
      </div>

      {/* Просрочки */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-red-700">Просрочки на сегодня</h2>
        {overdue.length === 0 ? (
          <p className="text-sm text-gray-500">Просрочек нет 👍</p>
        ) : (
          <RentalTable rows={overdue} highlight />
        )}
      </section>

      {/* Ближайшие возвраты */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Возвраты сегодня и завтра</h2>
        {dueSoon.length === 0 ? (
          <p className="text-sm text-gray-500">Нет ожидаемых возвратов.</p>
        ) : (
          <RentalTable rows={dueSoon} />
        )}
      </section>

      {/* Заявки с сайта */}
      <section className="rounded-xl border border-gray-200 bg-blue-50 p-4 text-sm text-gray-700">
        <div className="font-medium text-gray-800">Новые заявки с сайта</div>
        Заявки на бронь приходят в рабочий чат WhatsApp ({"автозаполненное сообщение"}). На этом
        этапе они оформляются вручную через раздел «Выдача».
      </section>
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${danger ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
      <div className={`text-2xl font-bold ${danger ? "text-red-700" : ""}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

type Row = {
  id: number;
  dueDate: Date;
  deposit: number;
  client: { id: number; name: string; phone: string; score: number; blacklisted: boolean; manualLevel: string | null; rentals: { status: string; dueDate: Date }[] };
  unit: { equipment: { name: string } };
};

function RentalTable({ rows, highlight }: { rows: Row[]; highlight?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-3 py-2 font-medium">Клиент</th>
            <th className="px-3 py-2 font-medium">Оборудование</th>
            <th className="px-3 py-2 font-medium">Срок до</th>
            <th className="px-3 py-2 font-medium">Залог</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const lvl = levelOf(r.client);
            return (
              <tr key={r.id} className={`border-t border-gray-100 ${highlight ? "bg-red-50/40" : ""}`}>
                <td className="px-3 py-2">
                  <Link href={`/manage/clients/${r.client.id}`} className="font-medium hover:underline">
                    {r.client.name}
                  </Link>
                  <div className="text-xs text-gray-400">
                    {lvl.emoji} {lvl.label}
                  </div>
                </td>
                <td className="px-3 py-2">{r.unit.equipment.name}</td>
                <td className="px-3 py-2">{r.dueDate.toLocaleDateString("ru-RU")}</td>
                <td className="px-3 py-2">{formatSom(r.deposit)}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/manage/return?rental=${r.id}`} className="text-red-600 hover:underline">
                    Возврат →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
