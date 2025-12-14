# 🔐 SUPABASE - LLAVES Y CREDENCIALES NECESARIAS

## ¿QUÉ NECESITAS?

Para conectar INVOZY con Supabase, necesitas obtener **3 llaves principales** de tu proyecto Supabase:

---

## 1️⃣ SUPABASE_URL
**¿Qué es?** La URL del servidor de Supabase donde viven tus datos

**Dónde encontrarlo:**
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto (o crea uno)
3. Haz clic en **"Project Settings"** (ícono de engranaje abajo a la izquierda)
4. Ve a **"API"** en la sidebar
5. Copia el valor **"Project URL"**

**Ejemplo:**
```
https://xxxxxxxxxxxx.supabase.co
```

---

## 2️⃣ SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)
**¿Qué es?** La llave pública que usas en el frontend (es seguro que sea pública)

**Dónde encontrarlo:**
1. En **"Project Settings"** → **"API"**
2. Bajo **"API keys"** o **"Auth"**
3. Copia **"anon" / "public"** key (la primera)

**Ejemplo:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANTE:** Esta llave va en `.env.local` con prefijo `NEXT_PUBLIC_` para que sea accesible desde el navegador

---

## 3️⃣ SUPABASE_SERVICE_ROLE_KEY
**¿Qué es?** La llave privada para operaciones sensibles desde el backend

**Dónde encontrarlo:**
1. En **"Project Settings"** → **"API"**
2. Bajo **"API keys"**
3. Copia **"service_role" / "secret"** key (la segunda, más larga)

**Ejemplo:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANTE:** Esta llave NO va en el navegador, solo en servidor. Es como una contraseña 🔒

---

## 📝 ARCHIVO .env.local

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# (Opcional - solo si usas Server Actions con Supabase)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🏗️ ESTRUCTURA EN SUPABASE

Además de las llaves, necesitas crear estas **tablas** en tu BD Supabase:

### 1. Tabla: `users` (Opcional - Supabase crea automáticamente)
```sql
-- Supabase Auth maneja esto automáticamente
-- Solo asegúrate que Auth esté habilitado
```

### 2. Tabla: `estimates`
```sql
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  estimate_number VARCHAR(50) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  client_address TEXT,
  project_title VARCHAR(255) NOT NULL,
  project_description TEXT,
  amount DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  issued_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'Draft',
  notes TEXT,
  terms TEXT,
  tax_id VARCHAR(100),
  signature TEXT,
  is_signed BOOLEAN DEFAULT false,
  project_photos JSONB DEFAULT '[]'::jsonb,
  company_name VARCHAR(255),
  company_address TEXT,
  company_email VARCHAR(255),
  company_phone VARCHAR(20),
  company_logo TEXT,
  company_website VARCHAR(255),
  contractor_name VARCHAR(255),
  scheduling_url VARCHAR(255),
  search_field TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_estimates_client_email ON estimates(client_email);
```

### 3. Tabla: `invoices`
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  invoice_number VARCHAR(50) NOT NULL,
  estimate_id UUID REFERENCES estimates(id),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  client_address TEXT,
  project_title VARCHAR(255) NOT NULL,
  project_description TEXT,
  amount DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  issued_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'Draft',
  notes TEXT,
  terms TEXT,
  tax_id VARCHAR(100),
  signature TEXT,
  is_signed BOOLEAN DEFAULT false,
  project_photos JSONB DEFAULT '[]'::jsonb,
  company_name VARCHAR(255),
  company_address TEXT,
  company_email VARCHAR(255),
  company_phone VARCHAR(20),
  company_logo TEXT,
  company_website VARCHAR(255),
  contractor_name VARCHAR(255),
  scheduling_url VARCHAR(255),
  search_field TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_email ON invoices(client_email);
CREATE INDEX idx_invoices_estimate_id ON invoices(estimate_id);
```

### 4. Tabla: `clients`
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  total_billed DECIMAL(10, 2) DEFAULT 0,
  document_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email)
);

CREATE INDEX idx_clients_user_id ON clients(user_id);
```

### 5. Tabla: `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT now(),
  payment_method VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
```

---

## ✅ CHECKLIST

- [ ] Crear cuenta en https://supabase.com
- [ ] Crear nuevo proyecto (o usar uno existente)
- [ ] Copiar `SUPABASE_URL`
- [ ] Copiar `SUPABASE_ANON_KEY`
- [ ] Copiar `SUPABASE_SERVICE_ROLE_KEY` (opcional para ahora)
- [ ] Crear archivo `.env.local` con las 3 llaves
- [ ] Habilitar Auth en Supabase (Email/Password o Google)
- [ ] Ejecutar SQL para crear tablas (o hacerlo desde UI de Supabase)
- [ ] Testear conexión

---

## 🧪 TESTEAR CONEXIÓN

Una vez tengas `.env.local` configurado, puedes testear con:

```typescript
// src/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Testea esto:
const { data: user, error } = await supabase.auth.getUser()
console.log('Usuario:', user)
console.log('Error:', error)
```

Si sale `null` en error y tienes datos en `user`, ¡estás conectado! ✅

---

## 🚨 IMPORTANTES

1. **NUNCA** commits `.env.local` a git (agrega a `.gitignore`)
2. **NUNCA** compartas la `SERVICE_ROLE_KEY` públicamente
3. La `ANON_KEY` es segura (es el punto del CORS en Supabase)
4. Las variables con `NEXT_PUBLIC_` se ven en el navegador, eso es normal
5. Las variables sin prefijo son solo para servidor

---

## 📚 REFERENCIAS

- Docs Supabase: https://supabase.com/docs
- Supabase JavaScript: https://supabase.com/docs/reference/javascript
- Setup Next.js + Supabase: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

