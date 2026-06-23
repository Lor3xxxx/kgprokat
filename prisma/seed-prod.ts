// Идемпотентная заливка данных в Postgres из prisma/seed-data.json.
// Запускается при сборке на Netlify. Если в БД уже есть оборудование — пропускает.
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL,
});

type Row = Record<string, unknown>;
const data: Record<string, Row[]> = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "prisma", "seed-data.json"), "utf8"),
);

const toDate = (r: Row, fields: string[]) => {
  for (const f of fields) if (typeof r[f] === "number") r[f] = new Date(r[f] as number);
  return r;
};
const toBool = (r: Row, fields: string[]) => {
  for (const f of fields) if (typeof r[f] === "number") r[f] = (r[f] as number) === 1;
  return r;
};

async function main() {
  const existing = await prisma.equipment.count().catch(() => 0);
  if (existing > 0) {
    console.log(`БД уже заполнена (${existing} позиций) — пропускаю seed.`);
    return;
  }

  console.log("Заливаю данные в Postgres…");

  await prisma.user.createMany({
    data: data.User.map((r) => toBool(toDate(r, ["createdAt"]), ["active"])) as never,
  });
  await prisma.category.createMany({ data: data.Category as never });
  await prisma.equipment.createMany({ data: data.Equipment.map((r) => toDate(r, ["createdAt"])) as never });
  await prisma.unit.createMany({ data: data.Unit as never });
  await prisma.client.createMany({
    data: data.Client.map((r) => toBool(toDate(r, ["consentAt", "createdAt"]), ["blacklisted", "consent"])) as never,
  });
  await prisma.rental.createMany({
    data: data.Rental.map((r) => toDate(r, ["startDate", "dueDate", "returnedAt", "createdAt"])) as never,
  });
  await prisma.setting.createMany({ data: data.Setting as never });

  // Сбрасываем счётчики автоинкремента id, чтобы новые записи не конфликтовали
  for (const t of ["User", "Category", "Equipment", "Unit", "Client", "Rental"]) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"','id'), (SELECT COALESCE(MAX(id),1) FROM "${t}"))`,
    );
  }

  const eq = await prisma.equipment.count();
  console.log(`Готово. Позиций: ${eq}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
