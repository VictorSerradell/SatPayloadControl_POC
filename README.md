# 🛰️ SatPayloadControl POC

> Ground Segment Payload Control System Simulator  
> Portfolio project for Aerospace/Space sector interviews (GMV, Indra, Oxigent, Thales...)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 10 + TypeScript |
| **Database** | PostgreSQL 15 |
| **Real-time** | Socket.io WebSockets |
| **Auth** | JWT (Passport.js) |
| **Frontend** | Angular 17+ (coming soon) |
| **Infra** | Docker + Docker Compose |

## Quick Start (Docker — recommended)

```bash
# 1. Clone
git clone https://github.com/YOUR_USER/satpayloadcontrol.git
cd satpayloadcontrol

# 2. Start backend + database
docker-compose up --build -d

# 3. View logs
docker-compose logs -f backend

# 4. Test the API
curl http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sat.dev","password":"Admin1234!"}'
```

## Quick Start (Native npm)

```bash
# Prerequisites: Node 20+, PostgreSQL 15 running locally

# Start PostgreSQL only via Docker
docker run -d --name sat-postgres \
  -e POSTGRES_DB=satpayload \
  -e POSTGRES_USER=satuser \
  -e POSTGRES_PASSWORD=satpass123 \
  -p 5432:5432 postgres:15-alpine

# Install and run backend
cd backend
cp .env.example .env
npm install
npm run start:dev
```

## Default Users

| Email | Password | Role |
|-------|----------|------|
| admin@sat.dev | Admin1234! | admin |
| operator@sat.dev | Operator1234! | operator |
| viewer@sat.dev | Viewer1234! | viewer |

## API Documentation

Swagger UI: **http://localhost:3000/api/docs**

### Key Endpoints

```
POST /api/v1/auth/login          → Get JWT token
GET  /api/v1/telemetry/latest    → Latest telemetry snapshot
GET  /api/v1/telemetry/buffer    → Last N readings (memory buffer)
GET  /api/v1/telemetry/history   → Historical data from DB
GET  /api/v1/commands/catalog    → Available telecommands
POST /api/v1/commands/send       → Send telecommand (operator/admin)
GET  /api/v1/events              → Event log
GET  /api/v1/events/unread-count → Unread alert count
```

### WebSocket Connection

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000/telemetry", {
  auth: { token: "YOUR_JWT_TOKEN" }
});

socket.on("telemetry", (data) => console.log("📡 Telemetry:", data));
socket.on("telemetry:alert", (alert) => console.warn("⚠️ Alert:", alert));
socket.on("event", (event) => console.log("📋 Event:", event));
```

## Project Structure

```
satpayloadcontrol/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # JWT auth, users, roles
│   │   │   ├── telemetry/     # WS gateway + REST + entity
│   │   │   ├── commands/      # Telecommand validation + log
│   │   │   ├── events/        # Event log
│   │   │   └── simulator/     # Mock telemetry generator
│   │   └── common/            # Guards, decorators, filters
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Running Tests

```bash
cd backend
npm run test              # Unit tests
npm run test:cov          # Coverage report
npm run test:e2e          # End-to-end tests
```

## Simulator Behavior

The `SimulatorService` generates realistic mock telemetry every 2 seconds:

- **Temperature**: Random walk + sinusoidal orbital variation (eclipse/sunlight cycles)
- **Voltage**: Small noise around nominal 28.5V bus
- **Current/Power**: Varies by instrument mode (ON=1200mA, STANDBY=400mA, OFF=50mA)
- **Battery**: Slow charge/discharge cycle with solar sinusoid
- **Signal**: Varies with simulated antenna pointing
- **Fault injection**: 1% random ERROR mode with 6s auto-recovery

## Extending This Project

- [ ] Angular 17+ Frontend (Dashboard, Commands, Event Log)
- [ ] CCSDS packet decoder for real satellite compatibility
- [ ] Yamcs adapter to connect to real ground systems
- [ ] TimescaleDB for efficient time-series queries
- [ ] Kubernetes manifests for production deployment
- [ ] OpenMCT integration as alternative UI

## License

MIT — Educational/Portfolio use
