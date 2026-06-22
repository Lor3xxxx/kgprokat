"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getSettings, levelOf } from "@/lib/queries";
import { depositForLevel, rentalCost } from "@/lib/domain";

export interface IssueState {
  error?: string;
}

export async function issueAction(_prev: IssueState, formData: FormData): Promise<IssueState> {
  const session = await requireSession();

  const equipmentId = Number(formData.get("equipmentId"));
  const days = Math.max(1, Number(formData.get("days")) || 0);

  // Клиент: либо существующий (clientId), либо новый
  let clientId = Number(formData.get("clientId")) || 0;

  if (!equipmentId || !days) return { error: "Укажите оборудование и срок" };

  if (!clientId) {
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const consent = formData.get("consent") === "on";
    if (!name || !phone) return { error: "Укажите ФИО и телефон клиента" };
    if (!consent) return { error: "Нужно согласие клиента на обработку персональных данных" };

    const existing = await prisma.client.findUnique({ where: { phone } });
    if (existing) {
      clientId = existing.id;
    } else {
      const created = await prisma.client.create({
        data: { name, phone, consent: true, consentAt: new Date() },
      });
      clientId = created.id;
    }
  }

  // Уровень клиента и расчёты
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { rentals: { select: { status: true, dueDate: true } } },
  });
  if (!client) return { error: "Клиент не найден" };

  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
  if (!equipment) return { error: "Оборудование не найдено" };

  const settings = await getSettings();
  const level = levelOf(client);

  if (level.key === "BLACKLIST") {
    return { error: "Клиент в чёрном списке — выдача заблокирована. При необходимости снимите метку в карточке." };
  }

  const deposit = depositForLevel(equipment.baseDeposit, level.key, settings);
  const cost = rentalCost(days, equipment.pricePerDay, equipment.pricePerWeek, settings);

  const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Берём свободный экземпляр и создаём аренду в транзакции
  try {
    await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.findFirst({
        where: { equipmentId, status: "FREE" },
      });
      if (!unit) throw new Error("Нет свободных экземпляров этой позиции");

      await tx.rental.create({
        data: {
          clientId,
          unitId: unit.id,
          status: "ISSUED",
          dueDate,
          rentalCost: cost,
          deposit,
          createdById: session.userId,
        },
      });
      await tx.unit.update({ where: { id: unit.id }, data: { status: "RENTED" } });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось оформить выдачу" };
  }

  redirect(`/manage/clients/${clientId}`);
}
