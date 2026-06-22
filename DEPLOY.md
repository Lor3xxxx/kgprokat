# Деплой на Netlify (демо без отдельной БД)

Для показа заказчику. Витрина (каталог, карточки, бронь через WhatsApp) работает полностью.
Рабочее место менеджера **открывается и выглядит**, но операции записи (оформить выдачу/возврат,
создать клиента) на этом этапе работать не будут — на Netlify файловая система только для чтения.
Запись подключим на следующем шаге (постоянная БД).

## Что уже готово в проекте
- `netlify.toml` — сборка + плагин Next.js + бандлинг SQLite-файла и движка Prisma в функции.
- `prisma/dev.db` — встроенные данные демо (274 позиции, фото, демо-клиенты).
- Бинарный таргет Prisma для Linux-рантайма Netlify (`rhel-openssl-3.0.x`).

## Переменные окружения (задать в Netlify → Site settings → Environment variables)
| Переменная | Значение |
|---|---|
| `DATABASE_URL` | `file:./prisma/dev.db` |
| `SESSION_SECRET` | длинная случайная строка (≥32 симв.) — **обязательно**, иначе прод не стартует |
| `NEXT_PUBLIC_WHATSAPP` | `996556600654` |
| `NEXT_PUBLIC_BASE_URL` | адрес сайта на Netlify, напр. `https://kyrgyzprokat.netlify.app` |

Сгенерировать секрет: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

## Способ 1 — через Netlify CLI (без git, проще всего)
```bash
npm i -g netlify-cli
netlify login
netlify deploy --build --prod
```
Переменные окружения задать заранее в дашборде или флагами `--env`.

## Способ 2 — через GitHub
1. Создать репозиторий и запушить проект (файл `prisma/dev.db` должен попасть в репо — он уже разрешён в `.gitignore`).
2. На Netlify: **Add new site → Import from Git**, выбрать репозиторий.
3. Build command и плагин подхватятся из `netlify.toml`.
4. Добавить переменные окружения (таблица выше) и задеплоить.

## Если каталог не открывается (ошибка БД в функции)
Это известная сложность SQLite в serverless. Самый надёжный путь для продакшена —
перейти на бесплатный Postgres (Neon/Supabase): это и есть шаг «подключим базу».
Тогда: создать БД → заменить `DATABASE_URL` → в `schema.prisma` сменить `provider` на `postgresql`
→ `npx prisma migrate deploy` → `npm run seed` + импорт каталога. Напишите — помогу.

## Демо-доступы рабочего места (/login)
- Админ: `admin` / `admin123`
- Менеджер: `manager` / `manager123`
