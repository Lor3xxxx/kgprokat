"use client";

import { useActionState, useMemo, useState } from "react";
import { depositForLevel, rentalCost, LevelKey } from "@/lib/domain";
import { formatSom } from "@/lib/config";
import { issueAction, IssueState } from "./actions";

interface Equip {
  id: number;
  name: string;
  category: string;
  pricePerDay: number;
  pricePerWeek: number;
  baseDeposit: number;
  free: number;
}

interface Settings {
  depositVerified: number;
  depositRegular: number;
  depositBlacklist: number;
  weekThresholdDays: number;
}

export default function IssueForm({
  equipment,
  settings,
  levelKey,
  existingClient,
  newClientPhone,
}: {
  equipment: Equip[];
  settings: Settings;
  levelKey: LevelKey;
  existingClient?: { id: number };
  newClientPhone?: string;
}) {
  const [state, action, pending] = useActionState<IssueState, FormData>(issueAction, {});
  const [equipmentId, setEquipmentId] = useState<number>(0);
  const [days, setDays] = useState(1);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");

  const categories = useMemo(
    () => [...new Set(equipment.map((e) => e.category))].sort((a, b) => a.localeCompare(b, "ru")),
    [equipment],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return equipment.filter(
      (e) => (!q || e.name.toLowerCase().includes(q)) && (!cat || e.category === cat),
    );
  }, [equipment, query, cat]);

  const shown = filtered.slice(0, 60);
  const selected = equipment.find((e) => e.id === equipmentId);

  const { cost, deposit } = useMemo(() => {
    if (!selected) return { cost: 0, deposit: 0 };
    return {
      cost: rentalCost(days, selected.pricePerDay, selected.pricePerWeek, settings),
      deposit: depositForLevel(selected.baseDeposit, levelKey, settings),
    };
  }, [selected, days, levelKey, settings]);

  const dueDate = new Date(Date.now() + days * 86400000).toLocaleDateString("ru-RU");
  const fieldCls = "w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none";

  return (
    <form action={action} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      {existingClient ? (
        <input type="hidden" name="clientId" value={existingClient.id} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-gray-600">ФИО клиента</span>
            <input name="name" required className={`mt-1 ${fieldCls}`} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Телефон</span>
            <input name="phone" defaultValue={newClientPhone} required className={`mt-1 ${fieldCls}`} />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="consent" className="h-4 w-4" />
            <span className="text-sm text-gray-600">Клиент дал согласие на обработку персональных данных</span>
          </label>
        </div>
      )}

      <input type="hidden" name="equipmentId" value={equipmentId || ""} />

      {/* Выбор оборудования с поиском */}
      <div>
        <span className="text-sm text-gray-600">Оборудование</span>

        {selected ? (
          <div className="mt-1 flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-3 py-2">
            <div>
              <div className="font-medium">{selected.name}</div>
              <div className="text-xs text-gray-500">
                {selected.category} · {formatSom(selected.pricePerDay)}/сут · свободно: {selected.free}
              </div>
            </div>
            <button type="button" onClick={() => setEquipmentId(0)} className="text-sm text-red-600 hover:underline">
              Изменить
            </button>
          </div>
        ) : (
          <div className="mt-1 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по названию…"
                className={fieldCls}
              />
              <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${fieldCls} sm:w-56`}>
                <option value="">Все категории</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {shown.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500">Ничего не найдено.</div>
              ) : (
                shown.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => setEquipmentId(e.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{e.name}</div>
                      <div className="text-xs text-gray-400">{e.category}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold">{formatSom(e.pricePerDay)}</div>
                      <div className="text-xs text-gray-400">своб.: {e.free}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
            {filtered.length > shown.length && (
              <div className="text-xs text-gray-400">Показаны первые {shown.length} из {filtered.length}. Уточните поиск.</div>
            )}
          </div>
        )}
      </div>

      <label className="block sm:w-48">
        <span className="text-sm text-gray-600">Срок, суток</span>
        <input
          name="days"
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
          className={`mt-1 ${fieldCls}`}
        />
      </label>

      {/* Расчёт */}
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3 text-center text-sm">
        <div>
          <div className="text-gray-500">Стоимость аренды</div>
          <div className="text-lg font-bold">{formatSom(cost)}</div>
        </div>
        <div>
          <div className="text-gray-500">Залог</div>
          <div className="text-lg font-bold">{formatSom(deposit)}</div>
        </div>
        <div>
          <div className="text-gray-500">Вернуть до</div>
          <div className="text-lg font-bold">{dueDate}</div>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Итого к получению при выдаче: <b>{formatSom(cost + deposit)}</b> (аренда + возвратный залог).
      </p>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !selected}
        className="w-full rounded-lg bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
      >
        {pending ? "Оформление…" : selected ? "Оформить выдачу" : "Выберите оборудование"}
      </button>
    </form>
  );
}
