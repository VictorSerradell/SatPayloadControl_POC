# Despliegue en Railway

## Estructura del proyecto en Railway
Un proyecto con 3 servicios: `backend`, `frontend`, `postgres`

---

## Paso 1 — Crear el proyecto en Railway

1. Ve a https://railway.app y crea un nuevo proyecto
2. Add Service → **Database → PostgreSQL** → nómbralo `postgres`
3. Add Service → **GitHub Repo** → selecciona tu repo → carpeta `backend` → nómbralo `backend`
4. Add Service → **GitHub Repo** → selecciona tu repo → carpeta `frontend` → nómbralo `frontend`

---

## Paso 2 — Variables de entorno del BACKEND

En el servicio `backend` → Settings → Variables, añade:

```
NODE_ENV=production
PORT=3000                          ← Railway lo sobreescribe automáticamente con $PORT
DB_HOST=${{Postgres.PGHOST}}       ← Variable de referencia de Railway
DB_PORT=${{Postgres.PGPORT}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_DATABASE=${{Postgres.PGDATABASE}}
DB_SYNC=true                       ← Cambiar a false tras primer deploy
DB_LOGGING=false
JWT_SECRET=<genera una cadena aleatoria de 64 chars>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://<tu-frontend>.up.railway.app   ← URL del servicio frontend
THROTTLE_TTL=60
THROTTLE_LIMIT=100
COMMAND_THROTTLE_LIMIT=10
TELEMETRY_INTERVAL_MS=2000
```

> ⚠️ Las variables `${{Postgres.PGHOST}}` etc. son referencias automáticas de Railway
> al servicio PostgreSQL del mismo proyecto. No las escribas a mano.

---

## Paso 3 — Variables de entorno del FRONTEND

En el servicio `frontend` → Settings → Variables, añade:

```
BACKEND_URL=https://<tu-backend>.up.railway.app
```

> Esta variable se inyecta en el Dockerfile como ARG durante el build,
> y queda bakeada en el bundle de Angular.

---

## Paso 4 — Configurar el Root Directory de cada servicio

En cada servicio → Settings → Source:
- **backend**: Root Directory = `backend`
- **frontend**: Root Directory = `frontend`

---

## Paso 5 — Orden de deploy

1. Primero despliega `postgres` (automático al crearlo)
2. Luego `backend` — espera a que el healthcheck pase (`/api/v1/health`)
3. Copia la URL pública del backend (ej: `https://satpayload-backend.up.railway.app`)
4. Pégala en `BACKEND_URL` y `CORS_ORIGIN`
5. Despliega `frontend`

---

## Paso 6 — Tras el primer deploy exitoso

Cambia en el backend:
```
DB_SYNC=false    ← Evita que TypeORM modifique el schema en producción
```

---

## URLs resultantes

| Servicio | URL |
|---|---|
| Frontend | `https://satpayload-frontend.up.railway.app` |
| Backend API | `https://satpayload-backend.up.railway.app/api/v1` |
| Swagger | `https://satpayload-backend.up.railway.app/api/docs` |

---

## Notas sobre WebSockets

Railway soporta WebSockets nativamente — no necesitas configuración extra.
Socket.IO funciona porque Railway mantiene conexiones HTTP persistentes (upgrade a WS).

