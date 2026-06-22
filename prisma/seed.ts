import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Простая транслитерация для slug
function slugify(s: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", " ": "-",
  };
  return s
    .toLowerCase()
    .split("")
    .map((ch) => (ch in map ? map[ch] : /[a-z0-9-]/.test(ch) ? ch : ""))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Категории из ТЗ (раздел 3.1)
const CATEGORIES = [
  "Перфораторы", "Болгарки УШМ", "Бетономешалки", "Вибраторы для бетона",
  "Генераторы", "Леса строительные", "Лестницы", "Виброплиты",
  "Отбойники", "Компрессоры", "Сварочные аппараты", "Мотобуры", "Газовое оборудование",
];

// [категория, название, сутки, неделя, базовый залог, кол-во экземпляров, описание]
const EQUIPMENT: [string, string, number, number, number, number, string][] = [
  ["Перфораторы", "Перфоратор Bosch GBH 2-26", 350, 1800, 4000, 3, "SDS-plus, 800 Вт, до 26 мм по бетону"],
  ["Перфораторы", "Перфоратор Makita HR2470", 350, 1800, 4000, 2, "SDS-plus, 780 Вт, реверс"],
  ["Болгарки УШМ", "УШМ Makita 125 мм", 250, 1200, 2500, 4, "Диск 125 мм, 720 Вт"],
  ["Болгарки УШМ", "УШМ Bosch 230 мм", 350, 1700, 3500, 2, "Диск 230 мм, 2000 Вт"],
  ["Бетономешалки", "Бетономешалка 180 л", 600, 3000, 8000, 2, "Объём 180 л, 220 В"],
  ["Бетономешалки", "Бетономешалка 130 л", 500, 2500, 6000, 2, "Объём 130 л, 220 В"],
  ["Вибраторы для бетона", "Глубинный вибратор 1.5 кВт", 500, 2500, 7000, 2, "Вал 4 м, булава 38 мм"],
  ["Генераторы", "Генератор 3 кВт бензиновый", 900, 4500, 15000, 2, "3 кВт, ручной старт"],
  ["Генераторы", "Генератор 5 кВт бензиновый", 1300, 6500, 22000, 1, "5 кВт, электростартер"],
  ["Леса строительные", "Леса рамные (секция)", 200, 900, 3000, 20, "Секция 2×1.5 м"],
  ["Лестницы", "Лестница-трансформер 4×4", 250, 1100, 3000, 3, "Алюминий, 4 секции"],
  ["Виброплиты", "Виброплита 90 кг", 1100, 5500, 18000, 2, "Бензиновая, 90 кг"],
  ["Отбойники", "Отбойный молоток 1500 Вт", 700, 3500, 9000, 2, "HEX, 1500 Вт, 25 Дж"],
  ["Компрессоры", "Компрессор 50 л", 600, 3000, 8000, 2, "Ресивер 50 л, 220 В"],
  ["Сварочные аппараты", "Сварочный инвертор 200 А", 400, 2000, 5000, 3, "MMA, 200 А"],
  ["Мотобуры", "Мотобур одноручный", 800, 4000, 12000, 2, "52 куб.см, шнек 200 мм"],
  ["Газовое оборудование", "Тепловая пушка газовая 30 кВт", 500, 2500, 7000, 2, "30 кВт, пропан"],
];

async function main() {
  console.log("Очистка...");
  await prisma.rental.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.category.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  console.log("Правила аренды...");
  await prisma.setting.create({
    data: {
      id: 1,
      minRentalDays: 1,
      finePerDay: 500,
      weekThresholdDays: 7,
      depositVerified: 0.5,
      depositRegular: 0.0,
      depositBlacklist: 1.0,
    },
  });

  console.log("Пользователи...");
  await prisma.user.create({
    data: {
      username: "admin",
      password: await bcrypt.hash("admin123", 10),
      name: "Владелец",
      role: "ADMIN",
    },
  });
  const manager = await prisma.user.create({
    data: {
      username: "manager",
      password: await bcrypt.hash("manager123", 10),
      name: "Кассир Айбек",
      role: "MANAGER",
    },
  });

  console.log("Категории и оборудование...");
  const catByName: Record<string, number> = {};
  for (const name of CATEGORIES) {
    const c = await prisma.category.create({ data: { name, slug: slugify(name) } });
    catByName[name] = c.id;
  }

  const usedSlugs = new Set<string>();
  for (const [cat, name, day, week, deposit, count, desc] of EQUIPMENT) {
    let slug = slugify(name);
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${slugify(name)}-${n++}`;
    usedSlugs.add(slug);

    const eq = await prisma.equipment.create({
      data: {
        name, slug, description: desc,
        pricePerDay: day, pricePerWeek: week, baseDeposit: deposit,
        categoryId: catByName[cat],
      },
    });
    for (let i = 1; i <= count; i++) {
      await prisma.unit.create({
        data: { equipmentId: eq.id, inventoryNo: `${slug}-${i}`, status: "FREE" },
      });
    }
  }

  console.log("Демо-клиенты...");
  // Постоянный клиент (балл 12)
  await prisma.client.create({
    data: { name: "Бакыт Осмонов", phone: "996555111222", score: 12, consent: true, consentAt: new Date(), notes: "Надёжный, берёт регулярно" },
  });
  // Проверенный (балл 4)
  await prisma.client.create({
    data: { name: "Нурлан Жээнбеков", phone: "996700333444", score: 4, consent: true, consentAt: new Date() },
  });
  // Новый (балл 0)
  await prisma.client.create({
    data: { name: "Айгуль Садырова", phone: "996501555666", score: 0, consent: true, consentAt: new Date() },
  });
  // Чёрный список
  await prisma.client.create({
    data: { name: "Эрлан Тойчубеков", phone: "996777888999", score: -5, blacklisted: true, consent: true, consentAt: new Date(), notes: "Не вернул отбойник, конфликт" },
  });

  console.log(`Готово. Менеджер id=${manager.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
