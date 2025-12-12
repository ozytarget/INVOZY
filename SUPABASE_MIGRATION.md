# 🚀 MIGRATION GUIDE: Firebase → Supabase

## Estado de la Migración

✅ **COMPLETADO:**
- Instaladas dependencias de Supabase
- Configurado archivo `.env.local` con credenciales
- Creadas tablas SQL en Supabase (users, clients, invoices, estimates, payments, work_orders, notifications)
- Creado provider Supabase (`src/supabase/provider.tsx`)
- Creado hook `useDocuments-supabase.tsx` con toda la lógica de CRUD
- Actualizado login form para usar Supabase Auth
- Actualizado layout principal para usar Supabase
- Actualizado dashboard layout
- Actualizado componentes: user-nav, settings-form, notifications-sheet
- Removido Firebase del package.json
- Aplicación compilando correctamente ✅

## Próximos Pasos: Deployment en Vercel

### 1️⃣ **Crear Repositorio en GitHub**

```bash
cd C:\Users\urbin\INVOZY
git init
git add .
git commit -m "Migrate from Firebase to Supabase"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/invozy.git
git push -u origin main
```

### 2️⃣ **Crear Cuenta en Vercel y Conectar Repo**

1. Ve a https://vercel.com/sign-up
2. Sign up con GitHub
3. Autoriza Vercel en GitHub
4. Click "Import Project"
5. Busca tu repo `invozy`
6. Click "Import"

### 3️⃣ **Agregar Variables de Entorno**

En la página de settings del proyecto en Vercel:

**Settings → Environment Variables**

Agrega estas variables:
```
NEXT_PUBLIC_SUPABASE_URL = https://dzlglymgffjifegnlouh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_S-CcMe0wjAfEQyFqHHCFvg_iY1f_RVt
SUPABASE_SERVICE_ROLE_KEY = sb_secret_VUk8nB6VhCX5g1qA_XSHgg_CKttejPd
```

### 4️⃣ **Configurar Supabase para Vercel**

En Supabase Dashboard → Authentication → URL Configuration:

**Authorized redirect URLs:**
```
https://tu-proyecto.vercel.app/auth/callback
https://tu-proyecto.vercel.app/
```

### 5️⃣ **Deploy**

```bash
git push origin main
```

Vercel deployará automáticamente. Verifica en https://vercel.com/deployments

## Testing en Local

```bash
npm run dev
```

Abre http://localhost:9002

Prueba:
- Login/Sign up
- Crear documento
- Editar documento
- Eliminar documento

## Próximas Mejoras

- [ ] Implementar notificaciones en Supabase
- [ ] Agregar Cloud Storage para archivos
- [ ] Optimizar queries con real-time subscriptions
- [ ] Agregar email notifications con Resend

## Troubleshooting

**Error: "Unauthorized"**
→ Verifica las credenciales en `.env.local`

**Error: "User doesn't have permission"**
→ Revisa RLS policies en Supabase Dashboard

**App no carga en Vercel**
→ Revisa logs en Vercel → Deployments → Function Logs
