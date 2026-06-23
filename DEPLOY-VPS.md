# Деплой на VPS (Ubuntu) — полноценная работа с SQLite

Рекомендуемый способ для этой системы: своя VPS, Node + Nginx + PM2 + SQLite.
Всё работает «по-настоящему» — и витрина, и рабочее место с сохранением аренд/клиентов.

## Что купить
- VPS с **Ubuntu 22.04/24.04**, минимум **1–2 ГБ RAM**, 1 vCPU (хватит с запасом).
- Домен или поддомен (например `prokat.kyrgyzprokat.kg`), A-запись на IP сервера.

## Разовая настройка сервера
```bash
# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm i -g pm2

# Клонируем проект
sudo mkdir -p /var/www && cd /var/www
git clone https://github.com/Lor3xxxx/kgprokat.git
cd kgprokat
npm ci
```

## Боевая база (отделяем данные от репозитория)
Чтобы обновления кода (`git pull`) не затирали реальные данные, БД храним вне репозитория:
```bash
sudo mkdir -p /var/lib/kgprokat
cp prisma/dev.db /var/lib/kgprokat/prod.db   # стартовый каталог 274 позиции
```

## Переменные окружения
Создать файл `/var/www/kgprokat/.env`:
```
DATABASE_URL="file:/var/lib/kgprokat/prod.db"
SESSION_SECRET="<длинная случайная строка, ≥32 символов>"
NEXT_PUBLIC_WHATSAPP="996556600654"
NEXT_PUBLIC_BASE_URL="https://prokat.kyrgyzprokat.kg"
```
Секрет: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

> Важно: путь `file:/var/lib/...` — абсолютный (Prisma поймёт его как абсолютный).

## Применить схему к боевой БД (один раз)
```bash
cd /var/www/kgprokat
npx prisma migrate deploy   # создаст таблицы, если их нет
# каталог уже в prod.db (скопировали выше). Если нужна чистая БД — npm run seed
```

## Сборка и запуск
```bash
npm run build
pm2 start npm --name kgprokat -- start    # next start на порту 3000
pm2 save && pm2 startup                    # автозапуск после перезагрузки
```

## Nginx + HTTPS
`/etc/nginx/sites-available/kgprokat`:
```nginx
server {
  server_name prokat.kyrgyzprokat.kg;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/kgprokat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d prokat.kyrgyzprokat.kg   # бесплатный SSL
```

## Обновление в будущем
```bash
cd /var/www/kgprokat && git pull && npm ci && npm run build && pm2 restart kgprokat
```
Данные в `/var/lib/kgprokat/prod.db` при этом не трогаются.

## Доступы рабочего места (/login)
- Админ: `admin` / `admin123`  · Менеджер: `manager` / `manager123`
(смените пароли после запуска — в разделе «Пользователи»)
