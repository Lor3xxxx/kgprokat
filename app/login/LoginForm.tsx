"use client";

import { useActionState } from "react";
import { loginAction, LoginState } from "./actions";

export default function LoginForm({ from }: { from: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="from" value={from} />
      {/* Honeypot — скрыто от людей, видно ботам */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      <label className="block">
        <span className="text-sm text-gray-600">Логин</span>
        <input
          name="username"
          autoFocus
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">Пароль</span>
        <input
          name="password"
          type="password"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-red-500 px-4 py-2.5 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
      >
        {pending ? "Вход…" : "Войти"}
      </button>
    </form>
  );
}
