"use client";

// Глобальный обработчик ошибок: пользователю — дружелюбное сообщение без техдеталей.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="text-5xl font-extrabold text-red-600">Ошибка</div>
      <h1 className="mt-3 text-xl font-bold">Что-то пошло не так</h1>
      <p className="mt-2 text-gray-500">Попробуйте обновить страницу. Если повторяется — сообщите администратору.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700"
      >
        Попробовать снова
      </button>
    </main>
  );
}
