import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { INIT_SQL } from "@/lib/init-sql";
import seed from "@/prisma/seed-data.json";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const data = seed as unknown as Record<string, Row[]>;

const toDate = (r: Row, fields: string[]) => {
  for (const f of fields) if (typeof r[f] === "number") r[f] = new Date(r[f] as number);
  return r;
};
const toBool = (r: Row, fields: string[]) => {
  for (const f of fields) if (typeof r[f] === "number") r[f] = (r[f] as number) === 1;
  return r;
};

// Одноразовая инициализация БД: создаёт схему и заливает данные.
// Защищено ключом (?key=SESSION_SECRET).
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!process.env.SESSION_SECRET || key !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Диагностика: какие переменные с БД доступны в рантайме
  if (req.nextUrl.searchParams.get("debug") === "1") {
    const keys = Object.keys(process.env).filter((k) => /DATABASE|NEON|POSTGRES|PG/i.test(k));
    return NextResponse.json({ dbEnvKeys: keys });
  }

  try {
    // Уже заполнено?
    try {
      const count = await prisma.equipment.count();
      if (count > 0) return NextResponse.json({ ok: true, message: `already seeded (${count})` });
    } catch {
      /* таблиц ещё нет — создадим ниже */
    }

    // 1) Создаём схему
    const statements = INIT_SQL.split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }

    // 2) Заливаем данные (в порядке зависимостей)
    await prisma.user.createMany({ data: data.User.map((r) => toBool(toDate(r, ["createdAt"]), ["active"])) as never });
    await prisma.category.createMany({ data: data.Category as never });
    await prisma.equipment.createMany({ data: data.Equipment.map((r) => toDate(r, ["createdAt"])) as never });
    await prisma.unit.createMany({ data: data.Unit as never });
    await prisma.client.createMany({ data: data.Client.map((r) => toBool(toDate(r, ["consentAt", "createdAt"]), ["blacklisted", "consent"])) as never });
    await prisma.rental.createMany({ data: data.Rental.map((r) => toDate(r, ["startDate", "dueDate", "returnedAt", "createdAt"])) as never });
    await prisma.setting.createMany({ data: data.Setting as never });

    // 3) Сбрасываем счётчики id
    for (const t of ["User", "Category", "Equipment", "Unit", "Client", "Rental"]) {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${t}"','id'), (SELECT COALESCE(MAX(id),1) FROM "${t}"))`,
      );
    }

    const eq = await prisma.equipment.count();
    return NextResponse.json({ ok: true, seeded: true, equipment: eq });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
