# Issue Desk API

A small API for recording software issues and moving them through `open`, `in_progress`, and `resolved` states. Built as a focused NestJS learning project with Codex assistance, to practise controllers, dependency injection, DTO validation, PostgreSQL queries, and OpenAPI documentation.

## Run locally

Requires Node.js 22 or newer. No cloud account or API key is needed.

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:3001/docs for Swagger UI, or http://127.0.0.1:3001/docs-json for the OpenAPI document. By default the app uses **PGlite**, an embedded PostgreSQL engine, and persists data in `.data/`. Copy `.env.example` to `.env` to customise the port or data directory. Use `npm run dev` for watch mode.

## Use a PostgreSQL server

```sh
docker compose up -d db
```

Set `DATABASE_URL` in `.env` using the local example in `.env.example`, then start the app. When `DATABASE_URL` is present, the same SQL runs through the `pg` connection pool. The schema and index are created on startup for this small demo. The Docker password is an intentionally public local example, not a real credential.

## Try the workflow

Use Swagger UI or an HTTP client:

1. `POST /api/v1/issues` with `{"title":"Weather API timeout","description":"Show cached data when the weather provider is unavailable."}`.
2. `GET /api/v1/issues?status=open&page=1&limit=10` to find work.
3. `PATCH /api/v1/issues/{id}/status` with `{"status":"in_progress"}`.
4. `GET /api/v1/issues/{id}` to inspect the updated record.
5. `GET /api/v1/health` to check database readiness.

Titles are 3–120 characters and descriptions 10–3000 after trimming. Unknown body fields are rejected. Page size is capped at 50; malformed IDs and unsupported statuses return 400, missing issues return 404. SQL values use bound parameters. A single SQL statement retrieves both page data and total count from the same snapshot.

## Verify

```sh
npm test
```

The HTTP suite covers validation, unknown fields, literal SQL-like input, persistence, pagination, status changes and filtering, missing records, invalid IDs, readiness, and generated OpenAPI schemas. It runs against an in-memory PGlite database by default. To exercise the `pg` driver against a server, set `DATABASE_URL` to a **separate disposable test database** before running. Tests create a schema and insert records; do not point them at data you want to keep.

## Scope and tradeoffs

This is an unauthenticated local learning API, not a deployed production service. It deliberately omits accounts, an AI provider, a frontend, and cloud deployment. Adding authentication and ownership checks, versioned database migrations, rate limits, and a separate production deployment configuration would be the next steps. An AI API is not necessary for the issue-tracking workflow, so none is simulated.

`src/database.ts` owns persistence; `src/issues.ts` contains the DTOs, service and routes; `src/app.ts` wires validation and OpenAPI. The PostgreSQL server path is supplied for local use; the initial local verification used PGlite.

## Learning checklist

Before presenting this project in an interview, explain: why DTO validation differs from TypeScript types; how Nest injects the database; why parameters protect SQL values; how pagination and totals work; what the database constraints enforce; and what would need to change for multiple authenticated users.

References: [NestJS validation](https://docs.nestjs.com/techniques/validation), [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction), [node-postgres queries](https://node-postgres.com/features/queries).
