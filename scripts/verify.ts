import assert from "node:assert";
import {
  clientLevel, ratingChange, depositForLevel, rentalCost, daysBetween, overdueDays,
} from "../lib/domain";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const S = { depositVerified: 0.5, depositRegular: 0, depositBlacklist: 1 };

function domainTests() {
  // Уровни
  assert.equal(clientLevel({ score: 0, blacklisted: false, hasDebt: false }).key, "NEW");
  assert.equal(clientLevel({ score: 4, blacklisted: false, hasDebt: false }).key, "VERIFIED");
  assert.equal(clientLevel({ score: 12, blacklisted: false, hasDebt: false }).key, "REGULAR");
  assert.equal(clientLevel({ score: 99, blacklisted: true, hasDebt: false }).key, "BLACKLIST");
  assert.equal(clientLevel({ score: 12, blacklisted: false, hasDebt: true }).key, "NEW", "долг блокирует уровень");
  assert.equal(clientLevel({ score: 0, blacklisted: false, manualLevel: "REGULAR", hasDebt: false }).key, "REGULAR", "ручной уровень");

  // Баллы
  assert.deepEqual(ratingChange("OK", false), { delta: 1, blacklist: false });
  assert.deepEqual(ratingChange("OVERDUE", false), { delta: -2, blacklist: false });
  assert.deepEqual(ratingChange("DAMAGE", false), { delta: -2, blacklist: false });
  assert.deepEqual(ratingChange("OK", true), { delta: -5, blacklist: true });

  // Залог
  assert.equal(depositForLevel(4000, "NEW", S), 4000);
  assert.equal(depositForLevel(4000, "VERIFIED", S), 2000);
  assert.equal(depositForLevel(4000, "REGULAR", S), 0);

  // Стоимость (порог недели = 7)
  assert.equal(rentalCost(3, 350, 1800, { weekThresholdDays: 7 }), 1050, "3 дня посуточно");
  assert.equal(rentalCost(7, 350, 1800, { weekThresholdDays: 7 }), 1800, "7 дней недельный выгоднее");
  assert.equal(rentalCost(10, 350, 1800, { weekThresholdDays: 7 }), 2850, "10 дней = неделя+3 дня");

  // Дни и просрочка
  const d0 = new Date("2026-06-01T10:00:00");
  assert.equal(daysBetween(d0, new Date("2026-06-04T10:00:00")), 3);
  assert.equal(overdueDays(new Date("2026-06-01"), new Date("2026-06-03")), 2);
  assert.equal(overdueDays(new Date("2026-06-10"), new Date("2026-06-03")), 0);

  console.log("✓ Доменные тесты пройдены");
}

async function dbRoundtrip() {
  // Берём «Нового» клиента и свободный экземпляр
  const client = await prisma.client.findUnique({ where: { phone: "996501555666" } }); // Айгуль, балл 0
  assert.ok(client && client.score === 0, "Айгуль должна иметь балл 0");
  const unit = await prisma.unit.findFirst({ where: { status: "FREE" }, include: { equipment: true } });
  assert.ok(unit, "должен быть свободный экземпляр");

  const level = clientLevel({ score: client!.score, blacklisted: client!.blacklisted, manualLevel: client!.manualLevel, hasDebt: false });
  const deposit = depositForLevel(unit!.equipment.baseDeposit, level.key, S);
  const cost = rentalCost(3, unit!.equipment.pricePerDay, unit!.equipment.pricePerWeek, { weekThresholdDays: 7 });
  assert.equal(deposit, unit!.equipment.baseDeposit, "новый клиент — полный базовый залог");

  // Выдача
  const rental = await prisma.rental.create({
    data: { clientId: client!.id, unitId: unit!.id, status: "ISSUED", dueDate: new Date(Date.now() + 3 * 86400000), rentalCost: cost, deposit },
  });
  await prisma.unit.update({ where: { id: unit!.id }, data: { status: "RENTED" } });
  const afterIssue = await prisma.unit.findUnique({ where: { id: unit!.id } });
  assert.equal(afterIssue!.status, "RENTED", "после выдачи экземпляр В аренде");

  // Возврат OK → +1 балл, экземпляр свободен
  const change = ratingChange("OK", false);
  await prisma.$transaction([
    prisma.rental.update({ where: { id: rental.id }, data: { status: "CLOSED", returnedAt: new Date(), conditionOnReturn: "OK", depositReturned: deposit } }),
    prisma.unit.update({ where: { id: unit!.id }, data: { status: "FREE" } }),
    prisma.client.update({ where: { id: client!.id }, data: { score: { increment: change.delta } } }),
  ]);
  const afterReturn = await prisma.client.findUnique({ where: { id: client!.id } });
  const unitAfter = await prisma.unit.findUnique({ where: { id: unit!.id } });
  assert.equal(afterReturn!.score, 1, "балл стал 1");
  assert.equal(unitAfter!.status, "FREE", "экземпляр снова свободен");

  // Откат к исходному состоянию seed
  await prisma.rental.delete({ where: { id: rental.id } });
  await prisma.client.update({ where: { id: client!.id }, data: { score: 0 } });

  console.log("✓ Цикл выдача→возврат проверен (балл 0→1, статусы корректны, данные откачены)");
}

async function main() {
  domainTests();
  await dbRoundtrip();
  await prisma.$disconnect();
  console.log("\nВСЁ ОК");
}

main().catch((e) => { console.error(e); process.exit(1); });
