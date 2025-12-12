# 🚀 DEPLOYMENT EN VERCEL - GUÍA RÁPIDA

Tu código ya está en GitHub: https://github.com/ozytarget/INVOZY

## PASOS PARA VERCEL:

### **1. Ve a https://vercel.com/new**

### **2. Importa tu Repo GitHub**
- Busca "INVOZY"
- Click "Import"

### **3. Configuración del Proyecto**
- Framework: **Next.js** (detectado automáticamente)
- Root Directory: **.** (punto)
- Click "Continue"

### **4. Agregar Variables de Entorno**
Copia y pega estas exactamente:

```
NEXT_PUBLIC_SUPABASE_URL=https://dzlglymgffjifegnlouh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_S-CcMe0wjAfEQyFqHHCFvg_iY1f_RVt
SUPABASE_SERVICE_ROLE_KEY=sb_secret_VUk8nB6VhCX5g1qA_XSHgg_CKttejPd
NEXT_PUBLIC_APP_URL=https://invozy.vercel.app
```

### **5. Deploy**
- Click "Deploy"
- Espera 3-5 minutos

### **6. Configurar Supabase**
Ve a https://app.supabase.com/project/dzlglymgffjifegnlouh/settings/auth

**Authentication → URL Configuration → Authorized redirect URLs**

Agrega:
```
https://invozy.vercel.app/auth/callback
https://invozy.vercel.app
```

### **7. ¡LISTO!**
Tu app estará en: https://invozy.vercel.app

---

## NOTA IMPORTANTE

⚠️ El `NEXT_PUBLIC_APP_URL` en Vercel debe ser el URL de producción (ej: https://invozy.vercel.app)

Si usas un dominio personalizado, actualiza ese valor.
