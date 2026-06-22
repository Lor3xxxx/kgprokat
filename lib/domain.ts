// Доменная логика KYRGYZ PROKAT (см. ТЗ разделы 4 и 5).
// Чистые функции без обращения к БД — их легко тестировать.

// ---------- Уровни доверия клиента (ТЗ 5.2) ----------

export type LevelKey = "NEW" | "VERIFIED" | "REGULAR" | "BLACKLIST";

export interface Level {
  key: LevelKey;
  label: string;
  emoji: string;
  color: string; // tailwind-классы для метки
}

export const LEVELS: Record<LevelKey, Level> = {
  NEW: { key: "NEW", label: "Новый", emoji: "🟡", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  VERIFIED: { key: "VERIFIED", label: "Проверенный", emoji: "🟢", color: "bg-green-100 text-green-800 border-green-300" },
  REGULAR: { key: "REGULAR", label: "Постоянный", emoji: "⭐", color: "bg-blue-100 text-blue-800 border-blue-300" },
  BLACKLIST: { key: "BLACKLIST", label: "Чёрный список", emoji: "🔴", color: "bg-red-100 text-red-800 border-red-300" },
};

export interface ClientLevelInput {
  score: number;
  blacklisted: boolean;
  manualLevel?: string | null;
  hasDebt: boolean; // есть непогашенный долг/активная просрочка
}

// Определяет уровень доверия по баллу, метке и долгу (ТЗ 5.2).
export function clientLevel(c: ClientLevelInput): Level {
  // Чёрный список — приоритетная метка, балл не важен
  if (c.blacklisted || c.manualLevel === "BLACKLIST") return LEVELS.BLACKLIST;

  // Ручное переопределение уровня (повышение менеджером)
  if (c.manualLevel && c.manualLevel in LEVELS) return LEVELS[c.manualLevel as LevelKey];

  // Непогашенный долг блокирует повышение — клиент остаётся «Новым»
  if (c.hasDebt) return LEVELS.NEW;

  if (c.score >= 10) return LEVELS.REGULAR;
  if (c.score >= 3) return LEVELS.VERIFIED;
  return LEVELS.NEW;
}

// ---------- Изменение балла при закрытии аренды (ТЗ 5.1) ----------

export type ReturnCondition = "OK" | "DAMAGE" | "OVERDUE";

export interface RatingChange {
  delta: number;
  blacklist: boolean;
}

// Сколько баллов добавить/снять при закрытии аренды.
// noReturn — невозврат/серьёзное повреждение → −5 и чёрный список.
export function ratingChange(condition: ReturnCondition, noReturn: boolean): RatingChange {
  if (noReturn) return { delta: -5, blacklist: true };
  switch (condition) {
    case "OK":
      return { delta: +1, blacklist: false };
    case "OVERDUE":
      return { delta: -2, blacklist: false };
    case "DAMAGE":
      return { delta: -2, blacklist: false };
  }
}

// ---------- Залог (ТЗ 4.4) ----------

export interface DepositSettings {
  depositVerified: number; // множитель базового залога для «Проверенного»
  depositRegular: number; // для «Постоянного»
  depositBlacklist: number; // для «Чёрного списка»
}

// Возвращает сумму залога по базовому залогу позиции и уровню клиента.
export function depositForLevel(baseDeposit: number, level: LevelKey, s: DepositSettings): number {
  const multiplier =
    level === "NEW" ? 1 : level === "VERIFIED" ? s.depositVerified : level === "REGULAR" ? s.depositRegular : s.depositBlacklist;
  return Math.round(baseDeposit * multiplier);
}

// ---------- Расчёт стоимости аренды (ТЗ 4.3) ----------

export interface CostSettings {
  weekThresholdDays: number; // с какого срока разрешён недельный тариф
}

// Считает стоимость аренды. При длительном сроке применяет недельный тариф,
// если он выгоднее посуточного.
export function rentalCost(
  days: number,
  pricePerDay: number,
  pricePerWeek: number,
  s: CostSettings,
): number {
  const d = Math.max(1, Math.ceil(days));
  const dailyOption = d * pricePerDay;

  if (d < s.weekThresholdDays) return dailyOption;

  const weeks = Math.floor(d / 7);
  const remainder = d % 7;
  const weeklyOption = weeks * pricePerWeek + remainder * pricePerDay;
  return Math.min(dailyOption, weeklyOption);
}

// ---------- Дни и просрочка ----------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Число суток между двумя датами (округление вверх, минимум 1).
export function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  return Math.max(1, Math.ceil(diff / MS_PER_DAY));
}

// Просрочена ли аренда на момент now (число дней просрочки, 0 если нет).
export function overdueDays(dueDate: Date, now: Date): number {
  const diff = now.getTime() - dueDate.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}

// ---------- Статусы оборудования и аренды (ТЗ 4.1, 4.2) ----------

export const UNIT_STATUS: Record<string, { label: string; color: string }> = {
  FREE: { label: "Свободно", color: "bg-green-100 text-green-800" },
  BOOKED: { label: "Забронировано", color: "bg-yellow-100 text-yellow-800" },
  RENTED: { label: "В аренде", color: "bg-blue-100 text-blue-800" },
  OVERDUE: { label: "Просрочено", color: "bg-red-100 text-red-800" },
  SERVICE: { label: "На обслуживании", color: "bg-gray-200 text-gray-700" },
  RETIRED: { label: "Списано", color: "bg-gray-100 text-gray-500" },
};

export const RENTAL_STATUS: Record<string, { label: string; color: string }> = {
  BOOKED: { label: "Забронирована", color: "bg-yellow-100 text-yellow-800" },
  ISSUED: { label: "В аренде", color: "bg-blue-100 text-blue-800" },
  OVERDUE: { label: "Просрочена", color: "bg-red-100 text-red-800" },
  CLOSED: { label: "Закрыта", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Отменена", color: "bg-gray-100 text-gray-500" },
};
