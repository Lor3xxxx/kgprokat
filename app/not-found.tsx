import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="text-5xl font-extrabold text-red-600">404</div>
      <h1 className="mt-3 text-xl font-bold">Страница не найдена</h1>
      <p className="mt-2 text-gray-500">Возможно, позиция снята с проката или ссылка устарела.</p>
      <Link href="/" className="mt-6 rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700">
        В каталог
      </Link>
    </main>
  );
}
