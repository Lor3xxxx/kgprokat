import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { formatSom, SHOP } from "@/lib/config";
import { getSettings } from "@/lib/queries";
import PublicHeader from "@/app/components/PublicHeader";
import BookingButton from "@/app/components/BookingButton";

export const dynamic = "force-dynamic";

export default async function EquipmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const eq = await prisma.equipment.findUnique({
    where: { slug },
    include: { category: true, units: true },
  });
  if (!eq) notFound();

  const settings = await getSettings();
  const available = eq.units.some((u) => u.status === "FREE");
  const url = `${SHOP.baseUrl}/equipment/${eq.slug}`;
  const qr = await QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#131316", light: "#ffffff" } });

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-6xl flex-1 px-4 py-8 w-full">
        <Link href={`/?cat=${eq.category.slug}`} className="kicker text-xs text-brand hover:text-brand-dark">
          ← {eq.category.name}
        </Link>

        {/* Верх: фото + основное (две колонки одинаковой высоты) */}
        <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start lg:gap-10">
          {/* Фото */}
          <div className="relative aspect-[4/3] overflow-hidden border border-line bg-white">
            {eq.photo ? (
              <Image
                src={eq.photo}
                alt={eq.name}
                fill
                priority
                sizes="(max-width:768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-7xl">🛠️</div>
            )}
            <span className={`absolute left-4 top-4 px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${available ? "bg-ink text-white" : "bg-white/90 text-gray-500"}`}>
              {available ? "в наличии" : "под заказ"}
            </span>
          </div>

          {/* Название, описание, цены */}
          <div>
            <div className="kicker text-xs text-brand">{eq.category.name}</div>
            <h1 className="mt-2 text-3xl font-bold uppercase leading-tight sm:text-4xl">{eq.name}</h1>
            {eq.description && <p className="mt-4 text-gray-600">{eq.description}</p>}

            <div className="mt-6 flex items-end gap-8 border-y border-line py-4">
              <div>
                <div className="kicker text-[10px] text-gray-400">Сутки</div>
                <div className="font-display text-3xl font-bold">{formatSom(eq.pricePerDay)}</div>
              </div>
              <div>
                <div className="kicker text-[10px] text-gray-400">Неделя</div>
                <div className="font-display text-2xl font-semibold text-gray-600">{formatSom(eq.pricePerWeek)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Низ: бронирование + QR/как арендовать */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
          <BookingButton
            whatsapp={SHOP.whatsapp}
            phones={SHOP.phones}
            equipmentName={eq.name}
            pricePerDay={eq.pricePerDay}
            pricePerWeek={eq.pricePerWeek}
            weekThresholdDays={settings.weekThresholdDays}
          />

          <div className="space-y-4">
            {/* Как арендовать */}
            <div className="border border-line bg-white p-5">
              <div className="kicker text-[10px] text-brand">Как арендовать</div>
              <ol className="mt-3 space-y-2 text-sm text-gray-600">
                <li><span className="font-display font-bold text-ink">1.</span> Выберите срок и нажмите «Забронировать в WhatsApp».</li>
                <li><span className="font-display font-bold text-ink">2.</span> Менеджер подтвердит наличие и условия залога.</li>
                <li><span className="font-display font-bold text-ink">3.</span> Заберите оборудование: {SHOP.address}.</li>
              </ol>
              <div className="mt-3 border-t border-line pt-3 text-xs text-gray-400">{SHOP.hours}</div>
            </div>

            {/* QR */}
            <div className="flex items-center gap-4 border border-line bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR-код" className="h-24 w-24" />
              <div className="text-sm text-gray-500">
                <div className="font-display font-semibold uppercase tracking-wide text-ink">QR на позицию</div>
                Наклейка для оборудования, визитки или объявления — ведёт на эту страницу.
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
