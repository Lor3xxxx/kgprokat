"use client";

import { useActionState } from "react";
import { createUserAction, CreateUserState } from "./actions";

const field = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none";

export default function CreateUserForm() {
  const [state, action, pending] = useActionState<CreateUserState, FormData>(createUserAction, {});

  return (
    <form action={action} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-gray-600">Логин</span>
          <input name="username" required className={field} placeholder="напр. aibek" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Имя</span>
          <input name="name" required className={field} placeholder="напр. Кассир Айбек" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Пароль</span>
          <input name="password" type="text" required className={field} placeholder="минимум 5 символов" />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Роль</span>
          <select name="role" defaultValue="MANAGER" className={field}>
            <option value="MANAGER">Менеджер</option>
            <option value="ADMIN">Администратор</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Аккаунт автоматически привяжется к устройству при первом входе. С другого устройства вход будет невозможен.
      </p>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
      >
        {pending ? "Создаём…" : "Создать аккаунт"}
      </button>
    </form>
  );
}
