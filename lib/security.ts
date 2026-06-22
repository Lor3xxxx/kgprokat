// Безопасность входа: привязка аккаунта к устройству + защита от подбора пароля.

// Cookie с идентификатором устройства (ставится при первой привязке, живёт долго)
export const DEVICE_COOKIE = "kp_device";

// --- Анти-брутфорс (в памяти процесса) ---
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 минут
const attempts = new Map<string, { fails: number; lockUntil: number }>();

export function loginLock(key: string): { locked: boolean; minutesLeft: number } {
  const a = attempts.get(key.toLowerCase());
  if (a && a.lockUntil > Date.now()) {
    return { locked: true, minutesLeft: Math.ceil((a.lockUntil - Date.now()) / 60000) };
  }
  return { locked: false, minutesLeft: 0 };
}

export function recordFail(key: string): void {
  const k = key.toLowerCase();
  const a = attempts.get(k) ?? { fails: 0, lockUntil: 0 };
  a.fails += 1;
  if (a.fails >= MAX_FAILS) {
    a.lockUntil = Date.now() + LOCK_MS;
    a.fails = 0; // сбрасываем счётчик, лок держит время
  }
  attempts.set(k, a);
}

export function clearFails(key: string): void {
  attempts.delete(key.toLowerCase());
}
