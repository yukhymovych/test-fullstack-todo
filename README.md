# Fullstack Notes Application

Мінімальний fullstack Notes додаток з React TypeScript фронтендом і Node.js Express бекендом.

## Структура проєкту

```
test-fullstack-todo/
├── src/                    # React фронтенд
│   ├── app/
│   │   └── providers/     # React Query та інші провайдери
│   ├── pages/             # Сторінки додатку
│   ├── shared/
│   │   ├── api/          # HTTP клієнт
│   │   └── config/       # Конфігурація (env)
│   └── main.tsx          # Точка входу
│
└── api/                   # Node.js Express бекенд
    ├── src/
    │   ├── server.ts     # Точка входу
    │   ├── app.ts        # Express додаток
    │   ├── db/           # Database connection
    │   ├── modules/      # Модулі (notes, auth)
    │   └── middlewares/  # Middlewares
    └── migrations/       # Database міграції
```

## Швидкий старт

### 1. Фронтенд (Vite + React + TypeScript)

```bash
# Встановлення залежностей
npm install

# Запуск dev сервера (http://localhost:5173)
npm run dev

# Build для production
npm run build
```

### 2. Бекенд (Node.js + Express + TypeScript + PostgreSQL)

```bash
cd api

# Встановлення залежностей
npm install

# Налаштування .env
cp .env.example .env
# Відредагуйте .env з вашими налаштуваннями бази даних

# Запуск міграцій
npm run migrate:up

# Запуск dev сервера (http://localhost:3001)
npm run dev
```

Детальну документацію по API дивіться в [api/README.md](api/README.md)

## Технології

### Frontend
- **Vite** - Build tool
- **React 19** - UI библіотека
- **TypeScript** - Типізація
- **React Query** - Управління серверним станом
- **Zod** - Валідація (готово до інтеграції)

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Типізація
- **PostgreSQL** - База даних
- **pg** - PostgreSQL клієнт
- **Zod** - Валідація вхідних даних
- **node-pg-migrate** - Database міграції

## API Ендпоінти

### Auth (no token required)
- `POST /auth/register` - Register: body `{ username, password }` → returns `{ token }`
- `POST /auth/login` - Login: body `{ username, password }` → returns `{ token }`
- `GET /auth/me` - Get current user (requires Bearer token)

### Notes (requires Bearer token in Authorization header)
- `GET /notes` - Отримати всі notes (user-scoped)
- `POST /notes` - Створити нову note
- `PATCH /notes/:id` - Оновити note
- `DELETE /notes/:id` - Видалити note

- `GET /health` - Перевірка стану сервера

## Особливості архітектури

### Frontend
- **Feature Sliced Design inspired** - Чітке розділення на app, pages, shared
- **API Layer** - Централізований HTTP клієнт (`shared/api/http.ts`)
- **Environment config** - Типізована конфігурація з env змінних
- **React Query** - Готовий setup для data fetching

### Backend
- **Layered Architecture** - Routes → Controllers → Services → SQL
- **Type Safety** - Повна типізація з TypeScript
- **Validation** - Zod схеми для валідації input
- **SQL First** - Прямі SQL запити через pg (без ORM)
- **CORS** - Налаштовано для `http://localhost:5173`
- **Error Handling** - Централізований error handler middleware

## Розробка

### Структура коду

**Frontend:**
- `src/app/providers` - React провайдери (Query, Router, etc.)
- `src/pages` - Компоненти сторінок
- `src/shared/api` - HTTP клієнт та API методи
- `src/shared/config` - Конфігурація додатку

**Backend:**
- `src/modules/notes` - Модуль notes з повним CRUD
- `src/modules/auth` - Модуль автентифікації
- `src/db` - Database connection pool
- `src/middlewares` - Express middlewares

## База даних

### Міграції

```bash
cd api

# Прогнати міграції
npm run migrate:up

# Відкотити останню міграцію
npm run migrate:down

# Створити нову міграцію
npm run migrate:create <migration-name>
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

### Backend (api/.env)
```
DATABASE_URL=postgresql://todo_user:password@localhost:5432/todo_db
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
```

**Important:** `JWT_SECRET` is required. The server will fail to start if it is not set. Use a long random string in production.

## Ліцензія

MIT
