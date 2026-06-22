import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings, levelOf } from "@/lib/queries";
import IssueForm from "./IssueForm";

export const dynamic = "force-dynamic";

export default async function IssuePage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;

  const settings = await getSettings();

  // Оборудование со свободными экземплярами
  const equipmentRaw = await prisma.equipment.findMany({
    include: { units: true, category: true },
    orderBy: { name: "asc" },
  });
  const equipment = equipmentRaw
    .map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category.name,
      pricePerDay: e.pricePerDay,
      pricePerWeek: e.pricePerWeek,
      baseDeposit: e.baseDeposit,
      free: e.units.filter((u) => u.status === "FREE").length,
    }))
    .filter((e) => e.free > 0);

  // Поиск клиента
  let client = null;
  let notFound = false;
  if (phone) {
    const c = await prisma.client.findUnique({
      where: { phone: phone.trim() },
      include: { rentals: { select: { status: true, dueDate: true } } },
    });
    if (c) {
      const lvl = levelOf(c);
      client = { id: c.id, name: c.name, phone: c.phone, score: c.score, level: lvl };
    } else {
      notFound = true;
    }
  }

  const settingsForClient = {
    depositVerified: settings.depositVerified,
    depositRegular: settings.depositRegular,
    depositBlacklist: settings.depositBlacklist,
    weekThresholdDays: settings.weekThresholdDays,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Оформление выдачи</h1>

      {/* Шаг 1 — поиск клиента по телефону */}
      <form action="/manage/issue" className="flex gap-2">
        <input
          name="phone"
          defaultValue={phone ?? ""}
          placeholder="Телефон клиента, напр. 996555111222"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
        />
        <button className="rounded-lg bg-gray-800 px-4 py-2 font-medium text-white hover:bg-gray-700">
          Найти
        </button>
      </form>

      {equipment.length === 0 && (
        <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          Нет свободного оборудования для выдачи.
        </p>
      )}

      {/* Шаг 2 — клиент найден */}
      {client && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${client.level.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/manage/clients/${client.id}`} className="font-semibold hover:underline">
                  {client.name}
                </Link>
                <div className="text-sm">{client.phone}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-medium">{client.level.emoji} {client.level.label}</div>
                <div>балл: {client.score}</div>
              </div>
            </div>
          </div>
          <IssueForm
            equipment={equipment}
            settings={settingsForClient}
            levelKey={client.level.key}
            existingClient={{ id: client.id }}
          />
        </div>
      )}

      {/* Шаг 2 — клиент не найден → создаём */}
      {notFound && (
        <div className="space-y-4">
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            Клиент с таким телефоном не найден. Заполните данные — будет создан новый клиент (уровень 🟡 Новый).
          </p>
          <IssueForm
            equipment={equipment}
            settings={settingsForClient}
            levelKey="NEW"
            newClientPhone={phone}
          />
        </div>
      )}
    </div>
  );
}
