import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatSom } from "@/lib/config";
import { RENTAL_STATUS } from "@/lib/domain";
import { levelOf } from "@/lib/queries";
import { updateClientAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ClientCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id: Number(id) },
    include: {
      rentals: {
        include: { unit: { include: { equipment: true } } },
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!client) notFound();

  const lvl = levelOf(client);
  const active = client.rentals.filter((r) => r.status === "ISSUED" || r.status === "OVERDUE");
  const debts = client.rentals.filter((r) => (r.fine ?? 0) > 0 && r.status === "CLOSED");

  return (
    <div className="space-y-6">
      <Link href="/manage/clients" className="text-sm text-red-600 hover:underline">← Клиенты</Link>

      {/* Шапка */}
      <div className={`rounded-xl border p-5 ${lvl.color}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <div className="text-sm">{client.phone}</div>
            {client.address && <div className="text-sm">{client.address}</div>}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{lvl.emoji} {lvl.label}</div>
            <div className="text-sm">балл рейтинга: {client.score}</div>
          </div>
        </div>
        {lvl.key === "BLACKLIST" && (
          <div className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">
            ⚠️ Клиент в чёрном списке — выдача заблокирована.
          </div>
        )}
      </div>

      {/* Активные аренды */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Текущие аренды</h2>
        {active.length === 0 ? (
          <p className="text-sm text-gray-500">Нет активных аренд.</p>
        ) : (
          <div className="space-y-2">
            {active.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm">
                <div>
                  <div className="font-medium">{r.unit.equipment.name}</div>
                  <div className="text-gray-500">
                    до {r.dueDate.toLocaleDateString("ru-RU")} · залог {formatSom(r.deposit)}
                  </div>
                </div>
                <Link href={`/manage/return?rental=${r.id}`} className="text-red-600 hover:underline">
                  Возврат →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* История аренд */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">История аренд</h2>
        {client.rentals.length === 0 ? (
          <p className="text-sm text-gray-500">История пуста.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Оборудование</th>
                  <th className="px-3 py-2 font-medium">Выдано</th>
                  <th className="px-3 py-2 font-medium">Срок до</th>
                  <th className="px-3 py-2 font-medium">Возврат</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium">Штраф</th>
                </tr>
              </thead>
              <tbody>
                {client.rentals.map((r) => {
                  const st = RENTAL_STATUS[r.status];
                  return (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{r.unit.equipment.name}</td>
                      <td className="px-3 py-2">{r.startDate.toLocaleDateString("ru-RU")}</td>
                      <td className="px-3 py-2">{r.dueDate.toLocaleDateString("ru-RU")}</td>
                      <td className="px-3 py-2">{r.returnedAt ? r.returnedAt.toLocaleDateString("ru-RU") : "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${st?.color ?? ""}`}>
                          {st?.label ?? r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">{r.fine ? formatSom(r.fine) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Управление: заметки, уровень, чёрный список */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Карточка и метки</h2>
        <form action={updateClientAction} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <input type="hidden" name="id" value={client.id} />
          <label className="block">
            <span className="text-sm text-gray-600">Адрес (опционально)</span>
            <input name="address" defaultValue={client.address ?? ""} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Заметки менеджера</span>
            <textarea name="notes" defaultValue={client.notes ?? ""} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Ручной уровень (переопределяет балл)</span>
            <select name="manualLevel" defaultValue={client.manualLevel ?? ""} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none">
              <option value="">— авто по баллу —</option>
              <option value="NEW">🟡 Новый</option>
              <option value="VERIFIED">🟢 Проверенный</option>
              <option value="REGULAR">⭐ Постоянный</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="blacklisted" defaultChecked={client.blacklisted} className="h-4 w-4" />
            <span className="text-sm text-gray-700">🔴 Чёрный список</span>
          </label>
          <div className="text-xs text-gray-400">
            Зарегистрирован: {client.createdAt.toLocaleDateString("ru-RU")} · согласие на обработку ПДн: {client.consent ? "есть" : "нет"}
            {debts.length > 0 && <span className="ml-2 text-red-600">· есть удержания по {debts.length} арендам</span>}
          </div>
          <button className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600">Сохранить</button>
        </form>
      </section>
    </div>
  );
}
