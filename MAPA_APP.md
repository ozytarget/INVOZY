Archivo: c:\Users\urbin\invozy\SQL_SETUP.sql
Cópialo completamente# 📱 MAPA DE LA APLICACIÓN - INVOZY

## 🎯 ESTRUCTURA GENERAL

```
INVOZY (Next.js 15 + React + TypeScript + Supabase)
│
├── 🔐 AUTENTICACIÓN (Login)
│   └── src/app/(auth)/
│       ├── login/page.tsx
│       └── signup/page.tsx
│
└── 📊 DASHBOARD (Área privada - requiere login)
    └── src/app/(dashboard)/
        ├── layout.tsx (Sidebar, navbar)
        ├── page.tsx (Home)
        │
        ├── 📈 INICIO (Dashboard)
        │   ├── stats-cards (Métricas)
        │   └── recent-documents-table
        │
        ├── 📋 ESTIMADOS
        │   ├── page.tsx (Listar)
        │   ├── create/page.tsx (Crear)
        │   └── edit/[id]/page.tsx (Editar)
        │
        ├── 💰 FACTURAS
        │   ├── page.tsx (Listar)
        │   ├── create/page.tsx (Crear)
        │   └── edit/[id]/page.tsx (Editar)
        │
        ├── 👥 CLIENTES
        │   └── page.tsx (Listar + crear)
        │
        ├── 💳 PAGOS
        │   └── page.tsx (Listar)
        │
        └── ⚙️ CONFIGURACIÓN
            └── manage/page.tsx
```

---

## 🔗 VISTAS PÚBLICAS (Sin autenticación)

```
├── src/app/public/[shareId]/page.tsx
│   └── Ver documento compartido
│
├── src/app/view/estimate/[id]/page.tsx
│   └── Ver estimado
│
├── src/app/view/invoice/[id]/page.tsx
│   └── Ver factura
│
└── src/app/view/work-order/[id]/page.tsx
    └── Ver orden de trabajo
```

---

## 💾 BASE DE DATOS (Supabase PostgreSQL)

### Tabla: `estimates`
```
id, user_id, estimate_number, client_name, client_email,
project_title, amount, tax_rate, issued_date, due_date,
status, notes, terms, signature, is_signed, line_items,
project_photos, company_name, company_address, etc,
created_at, updated_at
```

### Tabla: `invoices`
```
id, user_id, invoice_number, estimate_id, client_name,
client_email, project_title, amount, tax_rate,
issued_date, due_date, status, notes, terms, signature,
is_signed, line_items, project_photos, company_name,
company_address, etc, created_at, updated_at
```

### Tabla: `clients`
```
id, user_id, name, email, phone, address,
total_billed, document_count, created_at, updated_at
```

### Tabla: `payments`
```
id, invoice_id, amount, payment_date,
payment_method, notes, created_at
```

---

## 🎨 COMPONENTES CLAVE

### Diálogos
- `create-client-dialog` - Crear cliente inline
- `record-payment-dialog` - Registrar pago
- `send-email-dialog` - Enviar por email
- `delete-document-dialog` - Confirmar eliminación
- `search-dialog` - Buscar documentos
- `ai-suggestions-dialog` - IA para generar items

### Páginas/Layouts
- `documents-page` - Tabla de documentos (reutilizable)
- `document-view` - Vista detallada de documento
- `create-estimate-form` - Formulario estimados
- `create-invoice-form` - Formulario facturas
- `settings-form` - Configuración empresa

---

## 🔄 FLUJOS PRINCIPALES

### 1. CREAR ESTIMADO
```
New → Estimado
  ↓
Seleccionar cliente
  ↓
Agregar detalles + items (manual o IA)
  ↓
Guardar
  ↓
Ver/Editar/Compartir
```

### 2. FIRMAR ESTIMADO → FACTURA
```
Ver Estimado (público)
  ↓
Firmar
  ↓
Sistema crea Factura automáticamente
  ↓
Redirige a Factura
```

### 3. REGISTRAR PAGO
```
Factura Abierta
  ↓
Record Payment
  ↓
Ingresa monto + método
  ↓
Status actualiza (Partial/Paid)
```

---

## 🎯 RUTAS PROTEGIDAS

```
/dashboard (requiere login)
/dashboard/estimates
/dashboard/estimates/create
/dashboard/estimates/edit/[id]
/dashboard/invoices
/dashboard/invoices/create
/dashboard/invoices/edit/[id]
/dashboard/clients
/dashboard/payments
/dashboard/manage
```

---

## 🌐 RUTAS PÚBLICAS

```
/ (login)
/public/[shareId]
/view/estimate/[id]
/view/invoice/[id]
/view/work-order/[id]
```

---

## 🔐 AUTENTICACIÓN

- Supabase Auth (Email/Password o OAuth)
- Context + Hooks para estado
- Middleware para proteger rutas
- Redirect a login si no autenticado

---

## 📊 STACK CONFIRMADO

| Componente | Tecnología |
|-----------|-----------|
| Framework | Next.js 15.5.9 |
| React | 19.0.0 |
| Tipado | TypeScript 5.7.2 |
| Estilos | Tailwind CSS 3.4.1 |
| Base Datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Formularios | React Hook Form + Zod |
| Componentes UI | Shadcn/UI (opcional) |

---

## 🚀 FUNCIONALIDADES CORE

- ✅ Crear/editar/eliminar estimados y facturas
- ✅ Gestión de clientes
- ✅ Registrar pagos
- ✅ Enviar documentos por email
- ✅ Compartir documentos públicos
- ✅ Firma digital
- ✅ IA para generar items automáticamente
- ✅ Generar PDF (print-friendly)
- ✅ Estadísticas y reportes

---

Ver [GETTING_STARTED.md](GETTING_STARTED.md) para próximos pasos.

