"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function updateClientAction(formData: FormData): Promise<void> {
  await requireSession();

  const id = Number(formData.get("id"));
  if (!id) return;

  const address = String(formData.get("address") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const manualLevelRaw = String(formData.get("manualLevel") || "");
  const manualLevel = ["NEW", "VERIFIED", "REGULAR"].includes(manualLevelRaw) ? manualLevelRaw : null;
  const blacklisted = formData.get("blacklisted") === "on";

  await prisma.client.update({
    where: { id },
    data: { address, notes, manualLevel, blacklisted },
  });

  revalidatePath(`/manage/clients/${id}`);
}
