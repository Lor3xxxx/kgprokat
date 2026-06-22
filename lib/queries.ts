import "server-only";
import { prisma } from "./db";
import { clientLevel, Level } from "./domain";

// Настройки (правила аренды) — всегда строка id=1
export async function getSettings() {
  const s = await prisma.setting.findUnique({ where: { id: 1 } });
  if (s) return s;
  // на случай пустой БД — значения по умолчанию
  return prisma.setting.create({ data: { id: 1 } });
}

type RentalForDebt = { status: string; dueDate: Date };

// Есть ли активный долг: аренда выдана/просрочена и срок уже прошёл
export function hasActiveDebt(rentals: RentalForDebt[]): boolean {
  const now = new Date();
  return rentals.some(
    (r) => (r.status === "ISSUED" || r.status === "OVERDUE") && r.dueDate.getTime() < now.getTime(),
  );
}

export interface ClientLike {
  score: number;
  blacklisted: boolean;
  manualLevel: string | null;
  rentals?: RentalForDebt[];
}

// Уровень доверия клиента с учётом долга
export function levelOf(c: ClientLike): Level {
  return clientLevel({
    score: c.score,
    blacklisted: c.blacklisted,
    manualLevel: c.manualLevel,
    hasDebt: hasActiveDebt(c.rentals ?? []),
  });
}
