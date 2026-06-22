// Общая конфигурация прокатной точки.
// WhatsApp-номер берётся из переменной окружения (см. .env), с запасным значением.

export const SHOP = {
  name: "KYRGYZ PROKAT",
  tagline: "Аренда строительного оборудования · Бишкек",
  address: "г. Бишкек, ул. Куттубаева 26А/3",
  // Формат для wa.me — только цифры, без + и пробелов
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "996700000000",
  // Телефоны для звонка (как на сайте заказчика)
  phones: ["0556600654", "0707147737"],
  hours: "Пн–Пт 8:00–19:00, Сб 9:00–18:00, Вс выходной (обед 12:50–13:30)",
  // Базовый URL сайта — нужен для QR-кодов
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
} as const;

// Цена/сумма в сомах
export function formatSom(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value) + " сом";
}
