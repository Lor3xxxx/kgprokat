// Демо-аренды для наполнения аналитики (можно запускать после импорта каталога).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DAY = 86400000;

async function main() {
  const manager = await prisma.user.findFirst({ where: { role: "MANAGER" } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!manager || !admin) throw new Error("Нет пользователей — запустите seed.ts");

  const clients = await prisma.client.findMany({ take: 3, orderBy: { id: "asc" } });
  if (clients.length < 3) throw new Error("Мало клиентов — запустите seed.ts");

  // Берём 8 свободных экземпляров разных позиций
  const units = await prisma.unit.findMany({
    where: { status: "FREE" },
    include: { equipment: true },
    take: 8,
  });
  if (units.length < 8) throw new Error("Мало свободного оборудования");

  await prisma.rental.deleteMany(); // чистим прошлые демо-аренды

  const now = Date.now();
  // [сдвиг старта (дней назад), срок (дней), статус, condition, fine, кто оформил]
  const plan: [number, number, string, string | null, number, number][] = [
    [0, 3, "ISSUED", null, 0, manager.id],        // сегодня, активна
    [1, 2, "OVERDUE", null, 0, manager.id],        // просрочена (срок истёк)
    [2, 5, "CLOSED", "OK", 0, manager.id],         // закрыта норм
    [4, 3, "CLOSED", "OVERDUE", 1000, manager.id], // закрыта со штрафом
    [9, 7, "CLOSED", "OK", 0, admin.id],           // закрыта (оформил админ)
    [14, 4, "CLOSED", "OK", 0, manager.id],
    [22, 6, "CLOSED", "DAMAGE", 2500, manager.id],
    [28, 3, "CLOSED", "OK", 0, manager.id],
  ];

  for (let i = 0; i < plan.length; i++) {
    const [startAgo, term, status, condition, fine, createdById] = plan[i];
    const unit = units[i];
    const client = clients[i % clients.length];
    const start = new Date(now - startAgo * DAY);
    const due = new Date(start.getTime() + term * DAY);
    const cost = term * unit.equipment.pricePerDay;

    await prisma.rental.create({
      data: {
        clientId: client.id,
        unitId: unit.id,
        status,
        startDate: start,
        dueDate: due,
        rentalCost: cost,
        deposit: unit.equipment.baseDeposit,
        fine,
        conditionOnReturn: condition,
        returnedAt: status === "CLOSED" ? due : null,
        depositReturned: status === "CLOSED" ? Math.max(0, unit.equipment.baseDeposit - fine) : null,
        createdById,
      },
    });

    // активные аренды держат экземпляр занятым
    if (status === "ISSUED" || status === "OVERDUE") {
      await prisma.unit.update({ where: { id: unit.id }, data: { status: status === "OVERDUE" ? "OVERDUE" : "RENTED" } });
    }
  }

  console.log(`Создано демо-аренд: ${plan.length}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
