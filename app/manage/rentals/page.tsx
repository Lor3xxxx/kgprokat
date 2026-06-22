import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatSom } from "@/lib/config";
import { RENTAL_STATUS } from "@/lib/domain";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "", label: "Все" },
  { key: "ISSUED", label: "В аренде" },
  { key: "OVERDUE", label: "Просрочены" },
  { key: "CLOSED", label: "Закрыты" },
  { key: "CANCELLED", label: "Отменены" },
];

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const rentals = await prisma.rental.findMany({
    where: status ? { status } : {},
    include: { client: true, unit: { include: { equipment: true } } },
    orderBy: { startDate: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Аренды</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/manage/rentals?status=${f.key}` : "/manage/rentals"}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              (status ?? "") === f.key ? "bg-red-500 text-white border-red-500" : "bg-white border-gray-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rentals.length === 0 ? (
        <p className="text-gray-500">Нет аренд.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Клиент</th>
                <th className="px-3 py-2 font-medium">Оборудование</th>
                <th className="px-3 py-2 font-medium">Период</th>
                <th className="px-3 py-2 font-medium">Стоимость</th>
                <th className="px-3 py-2 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((r) => {
                const st = RENTAL_STATUS[r.status];
                return (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <Link href={`/manage/clients/${r.clientId}`} className="hover:underline">{r.client.name}</Link>
                    </td>
                    <td className="px-3 py-2">{r.unit.equipment.name}</td>
                    <td className="px-3 py-2">
                      {r.startDate.toLocaleDateString("ru-RU")} → {r.dueDate.toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-3 py-2">{formatSom(r.rentalCost)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${st?.color ?? ""}`}>
                        {st?.label ?? r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
