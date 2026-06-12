# Sardine Spotter

A free community app for tracking South Africa's KwaZulu-Natal sardine run. Users report sardine sightings, view them on a live map, and receive push notifications when sardines are spotted nearby.

**Live at:** [sardinespotter.com](https://sardinespotter.com)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript |
| Database | SQL Server |
| Push | Web Push (VAPID) via service worker |
| Mobile | PWA (installable) / React Native (APK — planned) |

## Project Structure

```
sardine-spotter/
├── api/                  # Backend API
│   ├── src/
│   │   ├── config/       # Database connection
│   │   ├── middleware/    # Auth (JWT)
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Push notifications
│   │   ├── types/        # TypeScript types
│   │   └── index.ts      # Entry point
│   └── uploads/          # Photo uploads (runtime)
├── web/                  # Frontend
│   ├── src/
│   │   ├── app/          # Next.js pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utils, API client, push helper
│   └── public/           # Static assets, service worker, manifest
└── sql/                  # Database schema
```

## Getting Started

### Prerequisites

- **Node.js** 18+ (22 recommended)
- **SQL Server** (any edition, including Express)
- A **Google Maps API key** (for the map view)

### 1. Database Setup

Create a new SQL Server database called `SardineSpotter`, then run the schema:

```sql
-- In SQL Server Management Studio or sqlcmd:
USE SardineSpotter;
GO

-- Run the schema script
:r sql/schema.sql
```

Or open `sardine-spotter/sql/schema.sql` in SSMS and execute it against your database.

### 2. Backend Setup

```bash
cd sardine-spotter/api

# Install dependencies
npm install

# Configure environment
# Edit .env with your SQL Server connection details:
#   DB_SERVER=localhost
#   DB_NAME=SardineSpotter
#   DB_TRUSTED_CONNECTION=true    (Windows auth)
#   — or —
#   DB_USER=your_user
#   DB_PASSWORD=your_password

# Generate VAPID keys for push notifications
npx web-push generate-vapid-keys
# Copy the output into .env as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY

# Start the API (development)
npm run dev
```

The API runs on **http://localhost:4000**.

### 3. Frontend Setup

```bash
cd sardine-spotter/web

# Install dependencies
npm install

# Create .env.local with:
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env.local
echo NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key_here >> .env.local

# Start the dev server
npm run dev
```

The app runs on **http://localhost:3000**.

### 4. Push Notifications (optional)

Push notifications require VAPID keys. Generate them once:

```bash
cd sardine-spotter/api
npx web-push generate-vapid-keys
```

Add both keys to `api/.env`:
```
VAPID_PUBLIC_KEY=BPe...
VAPID_PRIVATE_KEY=abc...
```

And add the public key to `web/.env.local`:
```
NEXT_PUBLIC_VAPID_KEY=BPe...
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Log in, receive JWT |
| GET | `/api/auth/me` | JWT | Get current user |
| GET | `/api/sightings` | — | List sightings (supports `lat`, `lng`, `radius` query params) |
| POST | `/api/sightings` | JWT | Report a sighting |
| GET | `/api/sightings/:id` | — | Get sighting details |
| DELETE | `/api/sightings/:id` | JWT | Delete own sighting |
| GET | `/api/comments/:sightingId` | — | Get comments |
| POST | `/api/comments/:sightingId` | JWT | Add a comment |
| GET | `/api/notifications` | JWT | Get user notifications |
| PUT | `/api/notifications/read-all` | JWT | Mark all as read |
| PUT | `/api/notifications/:id/read` | JWT | Mark one as read |
| POST | `/api/notifications/subscribe` | JWT | Save push subscription |
| POST | `/api/notifications/unsubscribe` | JWT | Remove push subscription |
| GET | `/api/notifications/vapid-key` | — | Get VAPID public key |
| POST | `/api/upload/photo` | JWT | Upload a sighting photo |
| GET | `/api/health` | — | Health check |

## Building for Production

```bash
# Backend
cd sardine-spotter/api
npm run build
npm start

# Frontend
cd sardine-spotter/web
npm run build
npm start
```

## License

Private — Sardine Spotter. All rights reserved.
