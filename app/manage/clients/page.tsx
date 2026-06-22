import Link from "next/link";
import { prisma } from "@/lib/db";
import { levelOf } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const clients = await prisma.client.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }] }
      : {},
    include: { rentals: { select: { status: true, dueDate: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Клиенты</h1>

      <form action="/manage/clients" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Поиск по имени или телефону"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
        />
        <button className="rounded-lg bg-gray-800 px-4 py-2 font-medium text-white hover:bg-gray-700">Найти</button>
      </form>

      {clients.length === 0 ? (
        <p className="text-gray-500">Клиентов не найдено.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Клиент</th>
                <th className="px-3 py-2 font-medium">Телефон</th>
                <th className="px-3 py-2 font-medium">Уровень</th>
                <th className="px-3 py-2 font-medium">Балл</th>
                <th className="px-3 py-2 font-medium">Активных</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const lvl = levelOf(c);
                const activeCount = c.rentals.filter((r) => r.status === "ISSUED" || r.status === "OVERDUE").length;
                return (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Link href={`/manage/clients/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{c.phone}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${lvl.color}`}>
                        {lvl.emoji} {lvl.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">{c.score}</td>
                    <td className="px-3 py-2">{activeCount > 0 ? activeCount : "—"}</td>
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
