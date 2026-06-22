import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { SHOP } from "@/lib/config";
import NavLinks from "./NavLinks";
import { logoutAction } from "./actions";

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/manage" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-500 text-white grid place-items-center font-bold text-sm">
                KP
              </div>
              <span className="font-bold">{SHOP.name}</span>
              <span className="text-xs text-gray-400">рабочее место</span>
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">
                {session.name}
                <span className="ml-1 text-gray-400">
                  ({session.role === "ADMIN" ? "админ" : "менеджер"})
                </span>
              </span>
              <form action={logoutAction}>
                <button className="rounded-lg border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50">
                  Выйти
                </button>
              </form>
            </div>
          </div>
          <div className="mt-3">
            <NavLinks isAdmin={session.role === "ADMIN"} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
