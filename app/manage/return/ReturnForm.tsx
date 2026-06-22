"use client";

import { useActionState, useState } from "react";
import { formatSom } from "@/lib/config";
import { returnAction, ReturnState } from "./actions";

export default function ReturnForm({
  rentalId,
  deposit,
  overdue,
  suggestedFine,
}: {
  rentalId: number;
  deposit: number;
  overdue: boolean;
  suggestedFine: number;
}) {
  const [state, action, pending] = useActionState<ReturnState, FormData>(returnAction, {});
  const [condition, setCondition] = useState<"OK" | "DAMAGE" | "OVERDUE">(overdue ? "OVERDUE" : "OK");
  const [noReturn, setNoReturn] = useState(false);
  const [fine, setFine] = useState(overdue ? suggestedFine : 0);

  const depositReturned = Math.max(0, deposit - fine);

  const ratingHint = noReturn
    ? "−5 баллов и чёрный список"
    : condition === "OK"
      ? "+1 балл"
      : "−2 балла";

  return (
    <form action={action} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <input type="hidden" name="rentalId" value={rentalId} />

      <div>
        <div className="text-sm text-gray-600 mb-1">Состояние при возврате</div>
        <div className="flex flex-wrap gap-2">
          {([
            ["OK", "ОК"],
            ["DAMAGE", "Повреждение"],
            ["OVERDUE", "Просрочка"],
          ] as const).map(([val, label]) => (
            <label
              key={val}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
                condition === val ? "border-red-500 bg-red-50 text-red-700" : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="condition"
                value={val}
                checked={condition === val}
                onChange={() => setCondition(val)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="noReturn" checked={noReturn} onChange={(e) => setNoReturn(e.target.checked)} className="h-4 w-4" />
        <span className="text-sm text-gray-700">Невозврат / серьёзное повреждение → в чёрный список</span>
      </label>

      <label className="block">
        <span className="text-sm text-gray-600">Удержать из залога (штраф/повреждение), сом</span>
        <input
          name="fine"
          type="number"
          min={0}
          value={fine}
          onChange={(e) => setFine(Math.max(0, Number(e.target.value)))}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-center text-sm">
        <div>
          <div className="text-gray-500">Вернуть клиенту залог</div>
          <div className="text-lg font-bold">{formatSom(depositReturned)}</div>
        </div>
        <div>
          <div className="text-gray-500">Рейтинг</div>
          <div className="text-lg font-bold">{ratingHint}</div>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
      >
        {pending ? "Оформление…" : "Закрыть аренду"}
      </button>
    </form>
  );
}
