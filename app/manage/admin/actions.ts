"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function updateSettingsAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const num = (k: string, min = 0) => Math.max(min, Number(formData.get(k)) || 0);

  await prisma.setting.update({
    where: { id: 1 },
    data: {
      minRentalDays: num("minRentalDays", 1),
      finePerDay: num("finePerDay"),
      weekThresholdDays: num("weekThresholdDays", 1),
      depositVerified: num("depositVerified"),
      depositRegular: num("depositRegular"),
      depositBlacklist: num("depositBlacklist"),
    },
  });

  revalidatePath("/manage/admin");
}

export async function updateEquipmentPricingAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!id) return;

  await prisma.equipment.update({
    where: { id },
    data: {
      pricePerDay: Math.max(0, Number(formData.get("pricePerDay")) || 0),
      pricePerWeek: Math.max(0, Number(formData.get("pricePerWeek")) || 0),
      baseDeposit: Math.max(0, Number(formData.get("baseDeposit")) || 0),
    },
  });

  revalidatePath("/manage/admin");
}
