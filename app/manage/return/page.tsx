import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatSom } from "@/lib/config";
import { overdueDays } from "@/lib/domain";
import { getSettings } from "@/lib/queries";
import ReturnForm from "./ReturnForm";

export const dynamic = "force-dynamic";

export default async function ReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ rental?: string; q?: string }>;
}) {
  const { rental: rentalParam, q } = await searchParams;
  const settings = await getSettings();

  // Конкретная аренда выбрана
  if (rentalParam) {
    const r = await prisma.rental.findUnique({
      where: { id: Number(rentalParam) },
      include: { client: true, unit: { include: { equipment: true } } },
    });
    if (!r) return <p className="text-gray-500">Аренда не найдена.</p>;

    const od = overdueDays(r.dueDate, new Date());
    const suggestedFine = od * settings.finePerDay;

    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Оформление возврата</h1>
        <Link href="/manage/return" className="text-sm text-red-600 hover:underline">← к списку</Link>

        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
          <div className="font-semibold">{r.unit.equipment.name}</div>
          <div className="text-gray-500">инв. № {r.unit.inventoryNo}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div><span className="text-gray-500">Клиент:</span> {r.client.name}</div>
            <div><span className="text-gray-500">Телефон:</span> {r.client.phone}</div>
            <div><span className="text-gray-500">Срок до:</span> {r.dueDate.toLocaleDateString("ru-RU")}</div>
            <div><span className="text-gray-500">Залог:</span> {formatSom(r.deposit)}</div>
          </div>
          {od > 0 && (
            <div className="mt-2 rounded-lg bg-red-50 p-2 text-red-700">
              Просрочка: {od} дн. Рекомендуемый штраф: {formatSom(suggestedFine)}
            </div>
          )}
        </div>

        <ReturnForm
          rentalId={r.id}
          deposit={r.deposit}
          overdue={od > 0}
          suggestedFine={suggestedFine}
        />
      </div>
    );
  }

  // Список активных аренд для поиска
  const active = await prisma.rental.findMany({
    where: {
      status: { in: ["ISSUED", "OVERDUE"] },
      ...(q
        ? {
            OR: [
              { client: { name: { contains: q } } },
              { client: { phone: { contains: q } } },
              { unit: { equipment: { name: { contains: q } } } },
            ],
          }
        : {}),
    },
    include: { client: true, unit: { include: { equipment: true } } },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Оформление возврата</h1>

      <form action="/manage/return" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Поиск по клиенту или оборудованию"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
        />
        <button className="rounded-lg bg-gray-800 px-4 py-2 font-medium text-white hover:bg-gray-700">Найти</button>
      </form>

      {active.length === 0 ? (
        <p className="text-gray-500">Активных аренд не найдено.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Клиент</th>
                <th className="px-3 py-2 font-medium">Оборудование</th>
                <th className="px-3 py-2 font-medium">Срок до</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {active.map((r) => {
                const od = overdueDays(r.dueDate, new Date());
                return (
                  <tr key={r.id} className={`border-t border-gray-100 ${od > 0 ? "bg-red-50/40" : ""}`}>
                    <td className="px-3 py-2">{r.client.name}<div className="text-xs text-gray-400">{r.client.phone}</div></td>
                    <td className="px-3 py-2">{r.unit.equipment.name}</td>
                    <td className="px-3 py-2">
                      {r.dueDate.toLocaleDateString("ru-RU")}
                      {od > 0 && <span className="ml-1 text-xs text-red-600">просрочка {od} дн.</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/manage/return?rental=${r.id}`} className="text-red-600 hover:underline">
                        Оформить возврат →
                      </Link>
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
