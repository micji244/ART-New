# ART Maintenance System (TypeScript)

This is an isolated TypeScript copy of the ART Maintenance System. The original JavaScript project remains separate and unchanged.

## What is TypeScript here?

- The React application is in `src/App.tsx` and `src/main.tsx`.
- Shared data contracts are in `src/types.ts`.
- The Node.js API is in `server/index.ts`.
- The server is compiled to `server-build/` before it starts.
- Vite configuration is in `vite.config.ts`.
- Production UI assets are built to `dist/`.

## Start this separate copy

1. Install Node.js 24 or later.
2. Copy `.env.example` to `.env`. Set `DATABASE_URL` to a PostgreSQL database you intend this copy to use, and replace `ADMIN_PASSWORD` with a private password of at least 6 characters. `DATA_DIR` is only for local server backup files; it is not the PostgreSQL database location.
3. Install the project packages (already done in this copy):

   ```powershell
   npm ci
   ```

4. Check TypeScript and build the application:

   ```powershell
   npm run build
   ```

5. Start the server:

   ```powershell
   npm start
   ```

6. Open `http://localhost:3001` (or the port configured in `.env`) and sign in with `ADMIN_USER_ID` and `ADMIN_PASSWORD`.

The server connects to PostgreSQL using `DATABASE_URL`. On a blank database it creates the required tables and the initial administrator account. This source copy does not include any users, repair records, or database credentials. Choose the database carefully: using the same database as another live installation means both installations can read and change the same records.

## Try the app locally without Supabase

Run `npm run dev:local`. This builds the app, starts a separate embedded PostgreSQL database under `data/local-postgres`, and starts the API and web app on this computer only. Open `http://127.0.0.1:5173` and sign in with `admin` / `demo12345` unless `LOCAL_ADMIN_PASSWORD` is set in the terminal environment. The demo database is separate from Supabase and the original project. Press `Ctrl+C` in the same terminal to stop it. The local demo data remains under `data/` between runs.

## Type checks

Run `npm run typecheck` to check both the React client and the TypeScript server. The client uses shared types for users, repairs, divisions, departments, audit logs, and related data. Strict checking is currently relaxed to keep the migration compatible with the existing code while types are added incrementally.

## Keep private runtime files private

`.env`, `data/`, `node_modules/`, `dist/`, and `server-build/` are excluded by `.gitignore`. Do not upload database credentials or other secrets to GitHub.
