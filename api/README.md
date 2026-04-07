# Notes API

Простий REST API для Notes додатку на Node.js + Express + TypeScript + PostgreSQL.

## Налаштування

### 1. Встановлення залежностей

```bash
cd api
npm install
```

### 2. Налаштування бази даних

Створіть базу даних PostgreSQL та користувача:

```sql
CREATE DATABASE todo_db;
CREATE USER todo_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE todo_db TO todo_user;
```

### 3. Налаштування змінних оточення

Створіть файл `.env` на основі `.env.example`:

```bash
cp .env.example .env
```

Відредагуйте `.env` з вашими реальними налаштуваннями:

```
DATABASE_URL=postgresql://todo_user:password@localhost:5432/todo_db
PORT=4000
```

Для Web Push (щоденні нагадування) додайте:

```
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
WEB_PUSH_VAPID_SUBJECT=mailto:you@example.com
DAILY_REMINDER_POLL_INTERVAL_MS=60000
REMINDER_ALLOW_MULTIPLE_PER_DAY=false
```

Згенерувати VAPID-ключі можна командою:

```bash
npx web-push generate-vapid-keys
```

### 4. Запуск міграцій

Прогоніть міграції для створення таблиць:

```bash
npm run migrate:up
```

Якщо потрібно відкотити міграції:

```bash
npm run migrate:down
```

### 5. Запуск сервера

Development режим (з hot reload):

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## API Ендпоінти

- `GET /health` - Перевірка стану сервера
- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- Notes: `GET /notes`, `POST /notes`, `PATCH /notes/:id`, `DELETE /notes/:id`

## Структура проєкту

```
api/
├── src/
│   ├── server.ts              # Точка входу
│   ├── app.ts                 # Express додаток
│   ├── db/
│   │   └── pool.ts           # PostgreSQL connection pool
│   ├── modules/
│   │   ├── auth/                    # Автентифікація
│   │   └── notes/                   # Notes CRUD
│   └── middlewares/
│       └── errorHandler.ts   # Обробка помилок
├── migrations/               # Database міграції
├── .env.example
├── package.json
└── tsconfig.json
```

## Скрипти

- `npm run dev` - Запуск в dev режимі з watch
- `npm run build` - Компіляція TypeScript
- `npm start` - Запуск production версії
- `npm run migrate:up` - Прогнати міграції вгору
- `npm run migrate:down` - Відкотити останню міграцію
- `npm run migrate:create <name>` - Створити нову міграцію
