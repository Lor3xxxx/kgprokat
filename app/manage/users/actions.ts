"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export interface CreateUserState {
  error?: string;
  ok?: string;
}

export async function createUserAction(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  await requireAdmin();

  const username = String(formData.get("username") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "MANAGER") === "ADMIN" ? "ADMIN" : "MANAGER";

  if (!username || !name) return { error: "Укажите логин и имя" };
  if (!/^[a-z0-9_.-]{3,}$/.test(username)) return { error: "Логин: минимум 3 символа, латиница/цифры/._-" };
  if (password.length < 5) return { error: "Пароль минимум 5 символов" };

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return { error: "Такой логин уже занят" };

  await prisma.user.create({
    data: { username, name, password: await bcrypt.hash(password, 10), role },
  });

  revalidatePath("/manage/users");
  return { ok: `Аккаунт «${username}» создан. Устройство привяжется при первом входе.` };
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();

  const id = Number(formData.get("id"));
  if (!id) return;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;

  const name = String(formData.get("name") || "").trim() || target.name;
  const role = String(formData.get("role") || target.role) === "ADMIN" ? "ADMIN" : "MANAGER";
  const active = formData.get("active") === "on";
  const newPassword = String(formData.get("newPassword") || "");

  // Не дать остаться без активных админов и не отключить самого себя
  const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
  const losingAdmin = target.role === "ADMIN" && (role !== "ADMIN" || !active);
  if (losingAdmin && activeAdmins <= 1) return;
  if (id === me.userId && !active) return;

  await prisma.user.update({
    where: { id },
    data: {
      name, role, active,
      ...(newPassword.length >= 5 ? { password: await bcrypt.hash(newPassword, 10) } : {}),
    },
  });

  revalidatePath("/manage/users");
}

// Сброс привязки устройства — аккаунт привяжется к новому устройству при следующем входе
export async function resetDeviceAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await prisma.user.update({ where: { id }, data: { deviceId: null } });
  revalidatePath("/manage/users");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id || id === me.userId) return;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;
  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return;
  }
  await prisma.rental.updateMany({ where: { createdById: id }, data: { createdById: null } });
  await prisma.user.delete({ where: { id } });

  revalidatePath("/manage/users");
}
