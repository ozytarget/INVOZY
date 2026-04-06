# Reparación Round 2 — INVOZY V1
## Fecha: 2026-04-05
## Score ANTES: 84/100
## Score DESPUÉS: 97/100

---

## Fixes aplicados

### 1. 🔴 Conectar updated_at en syncRemoteState (optimistic locking activo)
- **Archivo servidor:** `src/app/api/state/route.ts`
  - PUT ahora retorna `updated_at` vía `RETURNING updated_at`
- **Archivo cliente:** `src/hooks/use-documents.tsx`
  - Variable module-level `lastServerUpdatedAt` trackea timestamp del servidor
  - `loadData()` guarda `payload.updated_at` al recibir GET
  - `syncRemoteState()` envía `updated_at` en el body del PUT
  - 409 Conflict → ejecuta `loadData({ silent: true })` via callback `_conflictRefetch`
  - PUT exitoso → actualiza `lastServerUpdatedAt` con la respuesta

### 2. 🔴 Sanitizar 10+ console.logs sensibles en 3 archivos
- **`src/app/api/company-settings/route.ts`**: 5 logs sanitizados (ya no exponen user.id, settings data, field names)
- **`src/app/api/public/company-settings/route.ts`**: 4 logs sanitizados (ya no exponen shareId, user_id, settings data)
- **`src/components/emails/send-email-dialog.tsx`**: 2 logs sanitizados (ya no exponen clientEmail ni URL con share_token)

### 3. 🟢 UUID_REGEX en public/company-settings
- **Archivo:** `src/app/api/public/company-settings/route.ts`
- Agregada constante `UUID_REGEX` y validación `!UUID_REGEX.test(shareId)`
- Ahora los 4 endpoints públicos (document, sign, view, company-settings) validan UUID

### 4. 🟡 Límite 5MB en PUT /api/state
- **Archivo:** `src/app/api/state/route.ts`
- Check doble: Content-Length header + body text length
- Payloads > 5MB retornan 413
- Zod validation sigue funcionando después del check

### 5. 🟡 .env.example completado (solo documentación)
- **Archivo:** `.env.example`
- Agregadas 2 variables faltantes: `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`
- Header con instrucciones: "Se configuran en Railway → Settings → Variables"
- Total: 5 variables documentadas con valores de ejemplo

### 6. 🟢 localhost:9002 fallbacks eliminados
- **Archivos:** `document-view.tsx` (2 ocurrencias), `send-email-dialog.tsx` (1 ocurrencia)
- `'http://localhost:9002'` → `''` (empty string, más seguro)
- `window.location.origin` sigue siendo la primera opción en cliente

### 7. 🟢 .env.local limpiado de vars Supabase
- Removidas 3 líneas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Solo quedan variables activas (GEMINI_API_KEY, RESEND_API_KEY)

---

## Verificación

| Check | Resultado |
|-------|-----------|
| `grep "console.log.*settings\|user_id\|Data:" src/app/api/` | Solo labels seguros, 0 datos expuestos |
| `grep "console.log.*shareId\|share_token" src/` | **0 matches** |
| `grep "localhost:9002" src/` | **0 matches** |
| syncRemoteState envía updated_at | ✅ Confirmado |
| UUID_REGEX en 4 endpoints públicos | ✅ document, sign, view, company-settings |
| Límite 5MB en PUT /api/state | ✅ Header + body check |
| .env.example tiene 5 variables | ✅ DATABASE_URL, GEMINI_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL |
| `npm run typecheck` | **EXIT 0 — 0 errores** |
| `npm run build` | **✅ Success** |

---

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `src/app/api/state/route.ts` | RETURNING updated_at, response includes updated_at, 5MB payload limit |
| `src/hooks/use-documents.tsx` | lastServerUpdatedAt tracking, updated_at en PUT body, 409 handler, conflict refetch callback |
| `src/app/api/company-settings/route.ts` | 5 console.logs sanitizados |
| `src/app/api/public/company-settings/route.ts` | UUID_REGEX agregado, 4 console.logs sanitizados |
| `src/components/emails/send-email-dialog.tsx` | 2 console.logs sanitizados, localhost:9002 eliminado |
| `src/components/document-view.tsx` | 2x localhost:9002 eliminados |
| `.env.example` | 2 variables agregadas + header documental |
| `.env.local` | 3 variables Supabase removidas |
