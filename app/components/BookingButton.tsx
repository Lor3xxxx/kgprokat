"use client";

import { useMemo, useState } from "react";
import { rentalCost } from "@/lib/domain";
import { formatSom } from "@/lib/config";

type Term = "day" | "week" | "custom";

export default function BookingButton({
  whatsapp,
  phones,
  equipmentName,
  pricePerDay,
  pricePerWeek,
  weekThresholdDays,
}: {
  whatsapp: string;
  phones: readonly string[];
  equipmentName: string;
  pricePerDay: number;
  pricePerWeek: number;
  weekThresholdDays: number;
}) {
  const [term, setTerm] = useState<Term>("day");
  const [days, setDays] = useState(3);
  const [name, setName] = useState("");

  const { price, termLabel } = useMemo(() => {
    if (term === "day") return { price: pricePerDay, termLabel: "1 сутки" };
    if (term === "week") return { price: pricePerWeek, termLabel: "1 неделя" };
    return { price: rentalCost(days, pricePerDay, pricePerWeek, { weekThresholdDays }), termLabel: `${days} сут.` };
  }, [term, days, pricePerDay, pricePerWeek, weekThresholdDays]);

  const text =
    `Здравствуйте! Хочу арендовать: ${equipmentName}.` +
    ` Срок: ${termLabel}. Ориентировочная стоимость: ${formatSom(price)}.` +
    ` Меня зовут: ${name || "____"}`;
  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;

  const TermBtn = ({ value, label }: { value: Term; label: string }) => (
    <button
      type="button"
      onClick={() => setTerm(value)}
      className={`flex-1 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide transition ${
        term === value ? "bg-ink text-white" : "bg-white text-gray-500 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="border border-line bg-white p-5">
      <div className="kicker mb-2 text-[10px] text-gray-400">Срок аренды</div>
      <div className="flex gap-px border border-line bg-line">
        <TermBtn value="day" label="Сутки" />
        <TermBtn value="week" label="Неделя" />
        <TermBtn value="custom" label="Свой срок" />
      </div>

      {term === "custom" && (
        <label className="mt-3 block">
          <span className="text-sm text-gray-500">Количество суток</span>
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
            className="mt-1 w-full border border-line px-3 py-2 focus:border-brand focus:outline-none"
          />
        </label>
      )}

      <div className="mt-4 flex items-end justify-between border-y border-line py-3">
        <span className="text-sm text-gray-500">Стоимость аренды</span>
        <span className="font-display text-3xl font-bold">{formatSom(price)}</span>
      </div>

      <label className="mt-4 block">
        <span className="text-sm text-gray-500">Ваше имя</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="как к вам обращаться"
          className="mt-1 w-full border border-line px-3 py-2 focus:border-brand focus:outline-none"
        />
      </label>

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2 bg-brand px-4 py-3.5 font-bold uppercase tracking-wide text-white transition hover:bg-brand-dark shadow-[0_12px_28px_-12px_rgba(228,18,31,0.9)]"
      >
        Забронировать в WhatsApp
      </a>

      {phones.length > 0 && (
        <div className="mt-2 flex gap-px border border-line bg-line">
          {phones.map((p) => (
            <a key={p} href={`tel:${p}`} className="flex-1 bg-white px-3 py-2.5 text-center text-sm font-medium text-ink hover:bg-paper">
              {p}
            </a>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Залог зависит от условий аренды и определяется при оформлении. Доступность подтвердит менеджер.
      </p>
    </div>
  );
}
