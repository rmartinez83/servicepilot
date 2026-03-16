# Auth Foundation & Company Resolution — Staged Migration Plan

## Goal

Prepare ServicePilot so the current company can come from the logged-in user (via `company_members`) instead of a hardcoded constant, without breaking the app or changing UI design.

---

## Staged Migration Path

| Stage | State | Behavior |
|-------|--------|----------|
| **1. Current** | Hardcoded company | `lib/db.ts` uses `CURRENT_COMPANY_ID` constant. All reads/writes are scoped to the default company. No auth. |
| **2. Auth foundation** | Auth + fallback | Supabase Auth enabled. App has sign-in, sign-out, session. `company_id` still comes from a **resolver** that returns default when there is no session or no membership. App works with or without logging in. |
| **3. company_members lookup** | Resolver uses DB | When a user is signed in, app queries `company_members` (where `user_id = auth.uid()`) and uses the first company as current company. If none, fall back to default. |
| **4. Later (not this task)** | Remove fallback | Require auth for dashboard; no default company for unauthenticated users. Optional: company switcher when user has multiple memberships. |

---

## Implementation Plan (This Task)

### 1. Supabase Auth foundation

- Use existing Supabase client; Auth is built in (`getSupabase().auth`).
- No new env vars required (same URL/anon key).
- **RLS:** Add a policy on `company_members` so **authenticated** users can read their own rows: `user_id = auth.uid()`. (Anon stays denied.)

### 2. App-side auth flow structure

- **Auth provider (React context):**
  - Exposes: `user`, `session`, `loading`, `signIn`, `signOut`, `currentCompanyId`.
  - On mount: set `currentCompanyId` to default immediately (so UI doesn’t break), then get session; if session, fetch `company_members` for `session.user.id`, set `currentCompanyId` to first membership’s `company_id` or keep default.
  - Calls a **tenant setter** (see below) so the data layer can read current company.
- **Sign-in:** Minimal sign-in page (e.g. email + password) that calls `signInWithPassword`; no design change to rest of app.
- **Sign-out:** Function available in context; optional minimal “Sign out” link (e.g. in TopNav or sidebar) so the flow exists.
- **Session:** Provider subscribes to `onAuthStateChange` so session stays in sync.

### 3. Keep current app behavior

- No removal of existing behavior. If no user or no membership, `currentCompanyId` stays the default company; all existing pages keep working.
- Auth is **not** enforced: dashboard remains usable without logging in (fallback company).

### 4. Resolver + data layer

- **Resolver:** “Current company” = first row from `company_members` for current user, or default company if no session / no rows.
- **Data layer:** Replace direct use of `CURRENT_COMPANY_ID` in `lib/db.ts` with a **getter** `getCurrentCompanyId()` that returns a module-level value. Auth provider calls **setCurrentCompanyId(id)** after resolving company (or default). So:
  - `getCurrentCompanyId()` returns `_currentCompanyId ?? CURRENT_COMPANY_ID` (default constant remains the fallback).
  - Auth provider, after resolving company, calls `setCurrentCompanyId(resolvedId)` so all subsequent DB calls use that company.
- No change to function signatures in `lib/db.ts` or `lib/data.ts`; only the source of the company id changes.

### 5. Safe fallback

- Before session is loaded: `_currentCompanyId` is null → `getCurrentCompanyId()` = default → app works.
- No session: resolver never sets a different company → default.
- Session but no `company_members` row: resolver sets default → default.
- Session with membership: resolver sets that company id.

### 6. Files to create

| File | Purpose |
|------|---------|
| `lib/auth.ts` | `getSession`, `signIn`, `signOut`, `getCompanyIdForUser(userId)` (reads `company_members`), re-export default company id. |
| `components/providers/AuthProvider.tsx` | Context: user, session, loading, signIn, signOut, currentCompanyId. On mount: set company to default, then init session + company resolution; call `setCurrentCompanyId`. Subscribe to auth changes. |
| `app/(auth)/login/page.tsx` | Minimal login page (email/password form) using AuthProvider’s signIn. |
| `supabase/auth-company-members-rls.sql` | Add RLS policy: authenticated users can SELECT from `company_members` where `user_id = auth.uid()`. |

### 7. SQL to run

Run `supabase/auth-company-members-rls.sql` in the Supabase SQL Editor so authenticated users can read their own `company_members` rows. Without it, `getCompanyIdForUser` will always return null for signed-in users.

### 8. Files to modify

| File | Change |
|------|--------|
| `lib/db.ts` | Add `_currentCompanyId`, `getCurrentCompanyId()`, `setCurrentCompanyId()`. Replace every use of `CURRENT_COMPANY_ID` with `getCurrentCompanyId()`. Keep `CURRENT_COMPANY_ID` export as fallback constant. |
| `app/layout.tsx` | Wrap `children` with `AuthProvider` so session and company are available app-wide. |
| `components/layout/TopNav.tsx` or `Sidebar.tsx` | Add a minimal “Sign out” link/button that calls `signOut` from context (no design change; just the action). |

### 9. What we do not do (this task)

- Do not change UI design (beyond adding a minimal login page and sign-out).
- Do not enforce auth on routes (dashboard still works without login).
- Do not implement billing.
- Do not remove the default-company fallback.

---

## Order of implementation

1. **SQL:** Add RLS policy for `company_members` (authenticated read own rows).
2. **lib/db.ts:** Add getter/setter and use getter instead of constant.
3. **lib/auth.ts:** Auth helpers + `getCompanyIdForUser`.
4. **AuthProvider:** Context, session init, company resolution, setCurrentCompanyId.
5. **Root layout:** Wrap with AuthProvider.
6. **Login page:** Minimal sign-in form.
7. **Sign-out:** Small link or button in existing nav using context.

After this, the app remains functional without login (default company). With login and a `company_members` row, the app uses that user’s company. Later you can enforce auth and/or remove the fallback.
