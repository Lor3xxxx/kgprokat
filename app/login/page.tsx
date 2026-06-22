import Link from "next/link";
import { SHOP } from "@/lib/config";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-red-500 text-white grid place-items-center font-bold text-xl">
            KP
          </div>
          <h1 className="text-lg font-bold">{SHOP.name}</h1>
          <p className="text-sm text-gray-500">Рабочее место · вход</p>
        </div>

        <LoginForm from={from ?? "/manage"} />

        <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
          <div className="font-medium text-gray-600">Демо-доступы:</div>
          <div>Админ: admin / admin123</div>
          <div>Менеджер: manager / manager123</div>
        </div>

        <Link href="/" className="mt-4 block text-center text-sm text-red-600 hover:underline">
          ← на сайт-каталог
        </Link>
      </div>
    </main>
  );
}
