# SardineWatch — Operations & Infrastructure Guide

This document is the single reference for every external service, login, and tool used to run SardineWatch. Keep it updated whenever credentials or services change.

---

## 1. Architecture Overview

```
Users → sardinewatch.co.za (Vercel)
            ↓ API calls
    sardinewatch-api.onrender.com (Render)
            ↓ database
    sardinewatch-db.database.windows.net (Azure SQL)
```

| Layer | Service | URL |
|---|---|---|
| Frontend (Next.js) | Vercel | https://vercel.com |
| Backend API (Node.js/Express) | Render | https://render.com |
| Database (SQL Server) | Azure SQL | https://portal.azure.com |
| Email (password reset) | Resend | https://resend.com |
| Keep-alive monitoring | UptimeRobot | https://uptimerobot.com |
| Push notifications | Web Push (VAPID) | configured in Render env vars |
| Analytics | Vercel Analytics | included in Vercel dashboard |
| Domain / DNS | Absolute Hosting | https://absolutehosting.co.za |
| Google Play Store | Play Console | https://play.google.com/console |
| Source code | GitHub | https://github.com/whytefire/sardine-spotter |

---

## 2. Vercel (Frontend Hosting)

**URL:** https://vercel.com
**Project:** sardinewatch (connected to GitHub repo)

### What it does
Hosts the Next.js frontend. Auto-deploys on every push to the `main` branch on GitHub.

### How to deploy
Just push to GitHub — Vercel picks it up automatically within 1–2 minutes.

### Environment Variables
Set in: Vercel Dashboard → Project → Settings → Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the Render API (https://sardinewatch-api.onrender.com) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for push notifications |

### Custom Domain
`sardinewatch.co.za` and `www.sardinewatch.co.za` are both pointed at Vercel via DNS.

---

## 3. Render (Backend API Hosting)

**URL:** https://render.com
**Service name:** sardinewatch-api
**API URL:** https://sardinewatch-api.onrender.com

### What it does
Hosts the Node.js/Express API. Auto-deploys on every push to the `main` branch on GitHub.

### ⚠️ Important — Free Tier Spin-Down
The free tier spins the server down after 15 minutes of inactivity, causing a 30–60 second delay on the next request. **UptimeRobot** (see section 6) pings the health endpoint every 5 minutes to prevent this.

### Environment Variables
Set in: Render Dashboard → sardinewatch-api → Environment

| Variable | Description |
|---|---|
| `DATABASE_URL` | Azure SQL connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (default: `7d`) |
| `VAPID_PUBLIC_KEY` | VAPID public key for web push |
| `VAPID_PRIVATE_KEY` | VAPID private key for web push |
| `VAPID_MAILTO` | Email for VAPID contact |
| `RESEND_API_KEY` | API key from Resend for sending emails |
| `FRONTEND_URL` | `https://sardinewatch.co.za` |

### Health Check Endpoint
`GET https://sardinewatch-api.onrender.com/api/health`
Returns: `{ "status": "ok", "timestamp": "..." }`

---

## 4. Azure SQL (Database)

**URL:** https://portal.azure.com
**Server:** `sardinewatch-db.database.windows.net`
**Database:** `SardineSpotter`
**Admin user:** `sardinewatch_admin`

### Connecting via SSMS
- Server: `sardinewatch-db.database.windows.net`
- Authentication: SQL Server Authentication
- Username: `sardinewatch_admin`
- Password: *(your Azure SQL password)*
- Trust Server Certificate: ✅

### ⚠️ Important — Free Tier Monthly Limit
Azure SQL free tier has a monthly usage limit. If the database is paused:
1. Go to Azure Portal → SQL Databases → SardineSpotter
2. Click **Compute + storage**
3. Click **"Continue using database with additional charges"**

### Schema
The canonical schema is at `sql/schema.sql`. Run this file to recreate the DB from scratch.
New tables/columns are added as `ALTER TABLE` statements at the bottom of `schema.sql`.

### Tables
| Table | Purpose |
|---|---|
| `Users` | User accounts |
| `Sightings` | Sardine sighting reports |
| `Comments` | Comments on sightings |
| `Notifications` | In-app notification inbox |
| `SightingLikes` | Likes on sightings |
| `PushSubscriptions` | Device push notification registrations |
| `ModerationLog` | Audit trail for admin actions |
| `BadWords` | Profanity filter word list |
| `FeedPreferences` | Per-user feed settings |
| `PasswordResetTokens` | Forgot password tokens (1 hour expiry) |

---

## 5. Resend (Transactional Email)

**URL:** https://resend.com
**Sending domain:** `sardinewatch.co.za`
**From address:** `noreply@sardinewatch.co.za`

### What it does
Sends the forgot password reset email.

### DNS Records added to Absolute Hosting
| Type | Name | Purpose |
|---|---|---|
| TXT | `resend._domainkey` | DKIM domain verification |
| MX | `send` | SPF sending (feedback-smtp.eu-west-1.amazonses.com, priority 10) |
| TXT | `send` | SPF record (v=spf1 include:amazonses.com ~all) |

### To get a new API key
1. Login to resend.com
2. Go to **API Keys** → **Create API Key**
3. Add to Render environment variables as `RESEND_API_KEY`

---

## 6. UptimeRobot (Keep-Alive Monitoring)

**URL:** https://uptimerobot.com

### What it does
Pings the Render API health endpoint every 5 minutes to prevent the free tier from spinning down.

### Monitor configuration
- **Type:** HTTP(s)
- **Name:** SardineWatch API
- **URL:** `https://sardinewatch-api.onrender.com/api/health`
- **Interval:** Every 5 minutes

### Also useful for
Alerting you by email if the API goes down unexpectedly.

---

## 7. DNS / Domain (Absolute Hosting)

**URL:** https://absolutehosting.co.za
**Domain:** `sardinewatch.co.za`

### DNS Records
| Type | Name | Value | Purpose |
|---|---|---|---|
| A | `sardinewatch.co.za` | `216.198.79.1` | Root domain |
| CNAME | `www` | `0b0b5ef7ca599f6d.vercel-dns-017.com` | www → Vercel |
| TXT | `sardinewatch.co.za` | `google-site-verification=...` | Google Search Console |
| TXT | `sardinewatch.co.za` | `v=spf1 mx a include:_spf.absolutehosting.joburg ~all` | SPF |
| TXT | `resend._domainkey` | DKIM key | Resend email |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (priority 10) | Resend email |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | Resend SPF |

---

## 8. Google Play Store

**URL:** https://play.google.com/console
**Package name:** `za.co.sardinewatch.twa`
**Play Store listing:** https://play.google.com/store/apps/details?id=za.co.sardinewatch.twa

### How the Android app works
The app is a **Trusted Web Activity (TWA)** — essentially a wrapper around the PWA website. Generated via **PWABuilder** (https://pwabuilder.com).

### Important files
| File | Location | Purpose |
|---|---|---|
| `signing.keystore` | Safe storage (NOT in git) | Signs future AAB releases |
| `assetlinks.json` | `web/public/.well-known/assetlinks.json` | Verifies domain ownership for TWA |
| Key alias | `my-key-alias` | Used when signing |

### ⚠️ Keep your keystore file safe
If you lose `signing.keystore` you cannot upload future updates to Google Play. Store it somewhere safe (e.g. Google Drive, password manager).

### Uploading a new version
1. Go to PWABuilder → package for Android → use your existing keystore
2. Upload the new `.aab` file in Play Console → Production → Create new release
3. Google reviews within 1–7 days

### Sign-in details for Google reviewers
Google requires a test account to review the app:
- Create a test account at `sardinewatch.co.za/register`
- Add credentials in Play Console → **Policy and programmes** → **App content** → **Sign-in details**

---

## 9. GitHub (Source Code)

**URL:** https://github.com/whytefire/sardine-spotter
**Branch:** `main` (auto-deploys to both Vercel and Render)

### Repository structure
```
sardine-spotter/
├── web/          # Next.js frontend (deployed to Vercel)
├── api/          # Node.js/Express backend (deployed to Render)
├── sql/          # Database schema
│   └── schema.sql
└── OPERATIONS.md # This file
```

### To make code changes
1. Edit files in `web/` or `api/`
2. `git add -A`
3. `git commit -m "description of change"`
4. `git push`
5. Vercel and Render auto-deploy within 1–3 minutes

---

## 10. Key URLs Quick Reference

| What | URL |
|---|---|
| Live website | https://sardinewatch.co.za |
| API health check | https://sardinewatch-api.onrender.com/api/health |
| Play Store listing | https://play.google.com/store/apps/details?id=za.co.sardinewatch.twa |
| Delete account page | https://sardinewatch.co.za/delete-account |
| Privacy policy | https://sardinewatch.co.za/privacy |
| Terms of use | https://sardinewatch.co.za/terms |
| Admin login | https://sardinewatch.co.za/login (admin@sardinespotter.com) |
| Facebook page | https://facebook.com/profile.php?id=6159203607066 |

---

## 11. Contacts & Support

| Service | Support |
|---|---|
| Vercel | https://vercel.com/support |
| Render | https://render.com/support |
| Azure | https://portal.azure.com (support tickets) |
| Resend | https://resend.com/support |
| Google Play | https://support.google.com/googleplay/android-developer |
| Absolute Hosting | support@absolutehosting.co.za |

---

*Last updated: June 2026*
