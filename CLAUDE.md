# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bus scheduler application for public transit. Users search connections between stops; admins manage bus lines, routes, trips, and departures. Three sub-projects: `backend/` (Spring Boot), `frontend/` (React + TypeScript), `etl-tool/` (Python Streamlit for data import).

## Commands

### Backend (`backend/`)
```bash
mvn spring-boot:run          # Run with .env vars loaded
mvn clean package            # Build JAR
mvn test                     # Run all tests
mvn test -Dtest=ClassName    # Run single test class
```
Backend requires env vars `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` (see `backend/.env`).

### Frontend (`frontend/`)
```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run lint     # ESLint check
```
`VITE_API_URL` in `frontend/.env` points to the remote backend; during local dev it falls back to `localhost:8080` (see `frontend/src/config.ts`).

### ETL Tool (`etl-tool/`)
```bash
streamlit run etl_tool.py
```
Requires `GOOGLE_API_KEY` and `GROQ_API_KEY` in `etl-tool/.env`.

### Local DB (Docker)
```bash
docker-compose up -d    # Start PostgreSQL + PostGIS 16 locally
```

## Architecture

### Backend – Layered: Controller → ServiceImpl → Repository → JPA Entity

- **Domain** (`domain/`): JPA entities with Lombok. Key relationships:
  - `BusLine` → `Route[]` (orphanRemoval=true)
  - `Route` → `RouteStop[]`, `Trip[]` (orphanRemoval=true)
  - `Trip` → `Departure[]` (cascade=ALL); has `calendarType`: plain `String` field with allowed values `WORKDAYS`, `SATURDAYS`, `SUNDAYS_HOLIDAYS`
  - `Departure`: links `Trip` + `BusStop` + `LocalTime` (`departureTime` serialized as `"HH:mm:ss"`)
  - Bidirectional Jackson: `@JsonManagedReference` on owning side, `@JsonBackReference` on back-reference
- **Services** (`service/impl/`): Interfaces in `service/`, implementations in `service/impl/`
- **Security**: JWT (HS256, 24h expiry) via `JwtAuthenticationFilter`. Role rules: GET/PUT `/api/v1/admin/**` requires ROLE_ADMIN or ROLE_USER; POST/DELETE `/api/v1/admin/**` requires ROLE_ADMIN. Public endpoints: GET `/api/v1/**` (non-admin paths), `/api/busstops/**`, `/api/v1/auth/**`.
- **OSIV**: Open Session In View is active — lazy loading works inside controllers.
- **Admin sync pattern** (`AdminController`): Trip/departure sync uses `removeIf` for deletions, updates existing, creates new. New entities are sent with `id=null`; backend detects and persists them.
- **Initialization**: `DataInitializer` seeds demo users and bus line 241 on first run (see `DataInitializer.java` for credentials).
- **Tests**: JUnit 5 + TestContainers (PostgreSQL 16-alpine). Base class `AbstractIntegrationTest` wires the container. Coverage includes controller ITs, repository tests, and service unit tests.

### Frontend – React hooks + Axios + React Router v7

- **Routing** (`main.tsx`): `/` (search), `/login`, `/admin` (behind `ProtectedRoute` — checks JWT expiry)
- **API client** (`api/axiosConfig.ts`): Injects `Authorization: Bearer <token>` header; redirects to `/login` on 401
- **State**: Local `useState`/`useRef` — no global store. `AdminPanel.tsx` holds the full `BusLine` graph in `editingLine`; mutations are done immutably with spread + `Array.from`
- **Dark mode** (`hooks/useDarkMode.ts`): Persisted to `localStorage`, Tailwind class-based (`dark:` prefix)
- **Geolocation**: Browser API + Nominatim reverse geocoding in `SearchForm.tsx`; nearby stop distances use the Haversine formula via the backend `/api/busstops/nearby` endpoint
- **Bus stop cache** (`api/busStopsCache.ts`): Stops fetched once and cached for the session

## Key Conventions

- All source files must be **UTF-8 without BOM**
- `departureTime` is always `LocalTime` on the backend, serialized as `"HH:mm:ss"` strings
- `Trip.calendarType` is a plain `String` (not a Java enum) — allowed values are `WORKDAYS`, `SATURDAYS`, `SUNDAYS_HOLIDAYS`; day inference lives in `BusSearchServiceImpl`
- `BusStop` geographic lookup uses custom native SQL in `BusStopRepository` with Haversine calculation
