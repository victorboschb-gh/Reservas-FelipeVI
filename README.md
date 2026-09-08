# CIFP Felipe VI - Sistema de Reservas de Comedor

Sistema web de gestión de reservas de comedor para el **CIFP Felipe VI** de Segovia. Permite a los alumnos reservar comida, confirmar por email y gestionar el panel de administración.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)
![License](https://img.shields.io/badge/License-CC%20BY--SA%204.0-green)

---

## Funcionalidades

- **Reserva de comidas** - Los usuarios pueden ver el menú semanal y reservar raciones
- **Confirmación por email** - Sistema de doble verificación: email + aprobación admin
- **Gestión de alérgenos** - 14 alérgenos regulados (EU 1169/2011)
- **Panel de administración** - Gestión de menús, reservas, lista negra de emails y exportación a Excel
- **Sistema de blacklist** - Bloqueo de emails problemáticos
- **Auto-expiración** - Las reservas sin confirmar expiran a las 24 horas
- **Exportación Excel** - Descarga de listados de reservas en formato `.xlsx`
- **Notificaciones email** - Confirmaciones, rechazos y avisos automáticos
- **Docker** - Listo para despliegue en contenedores

---

## Tecnologías

| Tecnología | Uso |
|---|---|
| [Next.js 16](https://nextjs.org/) | Framework React con App Router |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Tailwind CSS 4](https://tailwindcss.com/) | Estilos utilitarios |
| [Neon Database](https://neon.tech/) | Base de datos PostgreSQL serverless |
| [Nodemailer](https://nodemailer.com/) | Envío de correos SMTP |
| [SheetJS (xlsx)](https://sheetjs.com/) | Exportación a Excel |
| [Docker](https://www.docker.com/) | Contenerización |

---

## Requisitos previos

- **Node.js** 18 o superior
- **PostgreSQL** (recomendado: [Neon](https://neon.tech/) o [Vercel Postgres](https://vercel.com/storage/postgres))
- Servidor **SMTP** para envío de correos

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/cifp-felipe-vi-reservas.git
cd cifp-felipe-vi-reservas
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local` con tus valores:

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@host/database

# Administración
ADMIN_USERNAME=tu_usuario_admin
ADMIN_PASSWORD=tu_password_seguro
ADMIN_SECRET=un_secreto_aleatorio_largo

# Email SMTP
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_USER=tu_email@ejemplo.com
SMTP_PASS=tu_password_smtp
SMTP_FROM=tu_email@ejemplo.com

# URL pública
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Crear las tablas de la base de datos

Ejecuta el SQL del archivo `vercel-postgres-schema.sql` en tu base de datos PostgreSQL.

### 5. Iniciar en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## Despliegue

### Vercel (recomendado)

1. Sube el repositorio a GitHub
2. Conéctalo en [vercel.com/new](https://vercel.com/new)
3. Configura las variables de entorno en el panel de Vercel
4. Ejecuta `vercel-postgres-schema.sql` en Vercel Postgres

### Docker

```bash
docker build -t reservas-felipe-vi .
docker run -p 3000:3000 --env-file .env.local reservas-felipe-vi
```

---

## Estructura del proyecto

```
cifp-felipe-vi-reservas/
├── src/
│   ├── app/
│   │   ├── api/                  # API Routes
│   │   │   ├── admin/            # Endpoints de administración
│   │   │   │   ├── blacklist/    # Gestión de lista negra
│   │   │   │   ├── login/        # Autenticación admin
│   │   │   │   ├── logout/       # Cierre de sesión
│   │   │   │   └── reservations/ # Aprobar, rechazar, eliminar
│   │   │   └── confirm/[token]/  # Confirmación de reserva por email
│   │   ├── admin/                # Panel de administración
│   │   ├── components/           # Componentes reutilizables
│   │   ├── confirmar/            # Página de confirmación
│   │   ├── reservar/             # Flujo de reserva
│   │   ├── layout.tsx
│   │   └── page.tsx              # Página principal (menú público)
│   ├── lib/
│   │   ├── constants.ts          # Alérgenos y constantes
│   │   ├── db.ts                 # Conexión a base de datos
│   │   └── email.ts              # Envío de correos
│   └── middleware.ts             # Protección de rutas admin
├── supabase/schema.sql           # Esquema Supabase (alternativa)
├── vercel-postgres-schema.sql    # Esquema PostgreSQL principal
├── Dockerfile
└── package.json
```

---

## Flujo de reserva

```
1. Usuario ve el menú → Selecciona día → Rellena datos
                         ↓
2. Reserva creada (estado: pending_confirmation)
                         ↓
3. Email de confirmación enviado al usuario
                         ↓
4. Usuario confirma vía link (estado: confirmed)
                         ↓
5. Si hay plazas → Confirmada ✓
   Si no hay plazas → Rechazada + email de aviso ✗
```

---

## Licencia

Este proyecto está licenciado bajo **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**.

Puedes usar, modificar y redistribuir este software, incluso con fines comerciales, siempre que desees crédito apropiado y distribuyas tus modificaciones bajo la misma licencia.

Consulta el archivo [LICENSE](./LICENSE) para más detalles o visita [creativecommons.org/licenses/by-sa/4.0](https://creativecommons.org/licenses/by-sa/4.0/).

---

## Créditos

Desarrollado para el **CIFP Felipe VI** — Segovia, España.

Este proyecto forma parte del **Proyecto Aula-Empresa+ Castilla y León 2025/2026**. Consulta el detalle de autoría y créditos en [CREDITS.md](./CREDITS.md).

<p>
  <img src="public/Logo_CIFP.png" alt="CIFP Felipe VI" width="80" />
  &nbsp;
  <img src="public/logo_junta.gif" alt="Junta de Castilla y León" width="80" />
</p>
