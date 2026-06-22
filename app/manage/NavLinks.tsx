"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/manage", label: "Дашборд", exact: true },
  { href: "/manage/issue", label: "Выдача" },
  { href: "/manage/return", label: "Возврат" },
  { href: "/manage/clients", label: "Клиенты" },
  { href: "/manage/rentals", label: "Аренды" },
];

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const links = isAdmin
    ? [
        ...LINKS,
        { href: "/manage/stats", label: "Аналитика" },
        { href: "/manage/users", label: "Пользователи" },
        { href: "/manage/admin", label: "Правила" },
      ]
    : LINKS;

  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((l) => {
        const active = l.exact ? path === l.href : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              active ? "bg-red-500 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
