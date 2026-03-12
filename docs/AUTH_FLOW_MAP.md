# Auth Flow Map (Auth0 Integration)

This document describes the authentication pipeline currently implemented in this project.

## Overview

Flow:

1. Frontend login trigger
2. Redirect to Auth0 Universal Login
3. Redirect back to app (`redirect_uri`)
4. Frontend obtains access token silently
5. Frontend sends API request with `Authorization: Bearer <access_token>`
6. Backend verifies bearer token via Auth0 JWT middleware
7. Backend resolves internal user via `auth0_sub`
8. Controllers/services execute using internal `user.id` (UUID)

## 1) Frontend Provider Initialization

- File: `src/app/providers/AppProviders.tsx`
- Component: `AppProviders`
- Auth setup:
  - `Auth0Provider`
  - `domain={AUTH0_DOMAIN}`
  - `clientId={AUTH0_CLIENT_ID}`
  - `authorizationParams.redirect_uri = window.location.origin`
  - `authorizationParams.audience = AUTH0_AUDIENCE`

## 2) Frontend Login Entry Points

- `src/pages/LoginPage.tsx`
  - `LoginPage` calls `login()` when user is not authenticated and not loading.
- `src/app/components/ProtectedRoute.tsx`
  - `ProtectedRoute` calls `login()` when `isAuthed` is false.
- `src/app/contexts/AuthContext.tsx`
  - `login()` delegates to `loginWithRedirect()` from `useAuth0()`.

## 3) Redirect / Callback Behavior

- File: `src/app/providers/AppProviders.tsx`
- Value used:
  - `redirect_uri: window.location.origin`
- Notes:
  - No explicit `/callback` route is defined in `src/App.tsx`.
  - Redirect handling relies on default `@auth0/auth0-react` behavior.

## 4) Access Token Retrieval

- File: `src/app/contexts/AuthContext.tsx`
- Logic:
  - Reads `getAccessTokenSilently` from `useAuth0()`.
  - On authenticated state, registers token provider:
    - `setTokenProvider(() => getAccessTokenSilently())`

## 5) API Request Authorization Header Injection

- File: `src/shared/api/http.ts`
- Function: `fetchJson()`
- Logic:
  - If `skipAuth` is false and `tokenProvider` exists:
    - fetch token via `await tokenProvider()`
    - set header: `Authorization: Bearer ${token}`

All feature API modules use this shared client, for example:

- `src/features/notes/api/notesApi.ts`
- `src/features/learning/api/learningApi.ts`
- `src/features/study-questions/api/studyQuestionsApi.ts`

## 6) Backend Bearer Token Verification

- File: `api/src/middlewares/requireAuth.ts`
- Library: `express-oauth2-jwt-bearer`
- Middleware setup:
  - `auth({ issuerBaseURL: "https://${AUTH0_DOMAIN}", audience: AUTH0_AUDIENCE })`
- Request handling:
  - `checkJwt(req, res, next)` validates incoming bearer token
  - extracts subject from `req.auth?.payload.sub`

## 7) Internal User Resolution (find-or-create)

- File: `api/src/middlewares/requireAuth.ts`
  - Calls `authSQL.findOrCreateByAuth0Sub(sub)`
  - Sets request user:
    - `req.user = { id: user.id, email: user.email, name: user.name }`

- File: `api/src/modules/auth/auth.sql.ts`
  - `findByAuth0Sub(auth0Sub)`
  - `createFromAuth0(auth0Sub, email, name)`
  - `findOrCreateByAuth0Sub(auth0Sub, email, name)`

## 8) Protected API Route Entry Points

- `api/src/modules/notes/notes.routes.ts`
  - `notesRouter.use(requireAuth)`
- `api/src/modules/learning/learning.routes.ts`
  - `learningRouter.use(requireAuth)`
- `api/src/modules/studyQuestionsAnswers/studyQuestionsAnswers.routes.ts`
  - `studyQuestionsAnswersRouter.use(requireAuth)`
- `api/src/modules/auth/auth.routes.ts`
  - `GET /auth/me` uses `requireAuth`

## 9) Internal Identity Used by Domain Logic

- Controllers use `req.user!.id` as internal user key (UUID), for example:
  - `api/src/modules/notes/notes.controller.ts`
  - `api/src/modules/learning/learning.controller.ts`
  - `api/src/modules/studyQuestionsAnswers/studyQuestionsAnswers.controller.ts`

This keeps domain data linked to internal `users.id`, not directly to Auth0 `sub`.

## 10) Data Model and User Ownership

- Users table origin:
  - `api/migrations/1771086597294_add-users-and-todos-user-id.js`
- Auth0 migration:
  - `api/migrations/1773500000000_migrate-users-to-auth0.js`
  - adds `auth0_sub`, `email`, `name`
- Entity ownership still uses internal user FK (`user_id -> users.id`) across domain tables.

## Environment Variables Used

Frontend:

- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`

Backend:

- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`

Files:

- `src/shared/config/env.ts`
- `api/src/app.ts`
- `api/src/middlewares/requireAuth.ts`
- `.env.example`
- `api/.env.example`
