import Link from "next/link";
import { SHOP } from "@/lib/config";

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-ink border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="grid h-10 w-10 place-items-center bg-brand text-white font-display font-bold text-lg shadow-[0_6px_20px_-6px_rgba(228,18,31,0.8)]">
            KP
          </div>
          <div className="leading-none">
            <div className="font-display text-xl font-bold tracking-wide text-white">{SHOP.name}</div>
            <div className="mt-0.5 hidden text-[11px] uppercase tracking-[0.18em] text-white/40 sm:block">Аренда оборудования · Бишкек</div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            {SHOP.phones.map((p) => (
              <a key={p} href={`tel:${p}`} className="block font-display text-sm font-medium tracking-wide text-white/80 hover:text-white">
                {p}
              </a>
            ))}
          </div>
          <a
            href={`https://wa.me/${SHOP.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark shadow-[0_8px_24px_-8px_rgba(228,18,31,0.9)]"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </header>
  );
}
