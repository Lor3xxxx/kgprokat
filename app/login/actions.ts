"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { DEVICE_COOKIE, loginLock, recordFail, clearFails } from "@/lib/security";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const from = String(formData.get("from") || "/manage");

  // Honeypot: скрытое поле, которое заполняют только боты
  if (String(formData.get("website") || "").trim() !== "") {
    return { error: "Неверный логин или пароль" };
  }

  if (!username || !password) {
    return { error: "Введите логин и пароль" };
  }

  // Защита от подбора пароля: блокировка после серии неудач
  const lock = loginLock(username);
  if (lock.locked) {
    return { error: `Слишком много неудачных попыток. Повторите через ${lock.minutesLeft} мин.` };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    recordFail(username);
    return { error: "Неверный логин или пароль" };
  }

  if (!user.active) {
    return { error: "Аккаунт отключён. Обратитесь к администратору." };
  }

  // Привязка «1 аккаунт = 1 устройство»
  const jar = await cookies();
  let device = jar.get(DEVICE_COOKIE)?.value;

  if (user.deviceId) {
    // Аккаунт уже привязан — вход только с того же устройства
    if (!device || device !== user.deviceId) {
      return { error: "Этот аккаунт привязан к другому устройству. Обратитесь к администратору, чтобы сбросить привязку." };
    }
  } else {
    // Первая привязка: запоминаем устройство (или создаём идентификатор)
    if (!device) {
      device = crypto.randomUUID();
      jar.set(DEVICE_COOKIE, device, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365 * 5, // 5 лет
      });
    }
    await prisma.user.update({ where: { id: user.id }, data: { deviceId: device } });
  }

  clearFails(username);

  await createSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role as "ADMIN" | "MANAGER",
  });

  redirect(from.startsWith("/manage") || from.startsWith("/admin") ? from : "/manage");
}
