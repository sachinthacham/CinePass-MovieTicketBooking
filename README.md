# 🎬 CinePass — Movie Ticket Booking Platform

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![ASP.NET Core](https://img.shields.io/badge/Backend-ASP.NET%20Core%208.0-blueviolet?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![SQL Server](https://img.shields.io/badge/Database-SQL%20Server-red?style=for-the-badge&logo=microsoftsqlserver)](https://www.microsoft.com/sql-server)
[![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Stripe](https://img.shields.io/badge/Payment-Stripe-008FDF?style=for-the-badge&logo=stripe)](https://stripe.com/)
[![SignalR](https://img.shields.io/badge/Real--Time-SignalR-orange?style=for-the-badge&logo=signalr)](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**CinePass** is a full-stack movie ticket booking platform: browse showtimes, watch seats lock and unlock **live** as other customers pick them, pay by card through Stripe, and receive a QR-coded e-ticket by email. Built with a **Clean Architecture** backend in **.NET 8** (CQRS via MediatR) and a **Next.js 16 / React 19** frontend.

This isn't a CRUD demo — it's built around the concurrency and payment-correctness problems a real booking system has to solve: two people can't buy the same seat, a card charge can't silently lose its ticket, and a webhook that fires twice can't create two bookings. See [Engineering Highlights](#-engineering-highlights) below.

---

## 🖼️ Screenshots

> Save your screenshots to `docs/screenshots/` using the filenames below (or update the paths).

<table width="100%">
  <tr>
    <td width="50%" align="center">
      <b>Landing Page</b><br/>
      <img src="docs/screenshots/landing.png" alt="CinePass landing page — Now Showing slider" width="100%"/>
    </td>
    <td width="50%" align="center">
      <b>Interactive Seat Selection</b><br/>
      <img src="docs/screenshots/seat-selection.png" alt="Live seat selection screen" width="100%"/>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <b>Stripe Checkout</b><br/>
      <img src="docs/screenshots/checkout.png" alt="Stripe secure checkout" width="100%"/>
    </td>
    <td width="50%" align="center">
      <b>Admin Dashboard</b><br/>
      <img src="docs/screenshots/admin-dashboard.png" alt="Admin panel — showtimes and analytics" width="100%"/>
    </td>
  </tr>
</table>

---

## 🏗️ Architecture

> Save the two diagrams to `docs/architecture-layers.png` and `docs/architecture-flow.png`.

**Backend layering** — dependencies only ever point inward; `MovieBooking.Domain` has zero external references.

<img src="docs/architecture-layers.png" alt="Clean Architecture layering diagram — Domain at the center, Application around it, Infrastructure and Api as the outer ring, arrows pointing inward" width="100%"/>

**A booking, start to finish** — from seat lock through Stripe payment to the (idempotent) webhook confirmation and live seat-status broadcast.

<img src="docs/architecture-flow.png" alt="Sequence diagram of the booking flow across Browser, Backend API, SQL Server, Stripe, and live viewers via SignalR" width="100%"/>

---

## ⭐ Engineering Highlights

The parts of this codebase most worth pointing to in an interview:

- **Idempotent payment confirmation** — Stripe delivers webhooks *at least once*, so `ConfirmBookingHandler` checks the booking's status first; a redelivered `payment_intent.succeeded` event is treated as a no-op instead of double-issuing tickets.
- **Transaction boundaries drawn around correctness, not convenience** — the Stripe `PaymentIntent` is created *before* the DB transaction opens (an external call should never hold a DB lock), while side effects that talk to the outside world (SignalR broadcast, confirmation email) fire only *after* the transaction commits, and never roll back a confirmed booking if they fail.
- **Real-time seat availability without polling** — a SignalR hub groups clients by showtime (`showtime-{id}`); when one customer locks or books a seat, every other browser watching that showtime updates instantly.
- **Self-healing seat locks** — a hosted background service (`SeatLockCleanupService`) periodically reclaims seats whose lock expired or whose booking was abandoned mid-checkout, so inventory never gets stuck.
- **Rate limiting scoped to the actual threat** — auth endpoints (brute force / credential stuffing) and seat-lock endpoints (griefing) each carry their own limiter, rather than one blanket policy.
- **Enforced dependency direction** — Clean Architecture isn't just a folder name here: `MovieBooking.Domain` has no project references at all; `Application` depends only on `Domain`; `Api` and `Infrastructure` are the only projects allowed to know about EF Core, Stripe, or ASP.NET.
- **CQRS + a validation pipeline** — every command/query runs through FluentValidation automatically via a MediatR pipeline behavior, so handlers never have to hand-roll input checks.

---

## 🛠️ Technology Stack

| Layer | Technologies | Key Libraries |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4 | Zustand, Axios, TanStack Query, React Hook Form, Zod, Radix UI |
| **Backend API** | ASP.NET Core 8 Web API (C#) | MediatR (CQRS), FluentValidation, AutoMapper, Serilog, Swashbuckle |
| **Persistence** | Microsoft SQL Server | EF Core (code-first migrations) |
| **Real-time** | ASP.NET Core SignalR | WebSocket seat-availability broadcasts |
| **Auth** | JWT + refresh tokens | Google / Facebook / Apple OAuth |
| **Payments** | Stripe (Elements + PaymentIntents + webhooks) | Stripe.net |
| **Other services** | QR codes, email, background jobs | QRCoder, MailKit (SMTP), ASP.NET hosted services |
| **Infra** | Containerization | Docker, Docker Compose |
| **Testing** | Backend unit tests | xUnit, Moq |

---

## 📂 Project Structure

```text
├── backend
│   └── MovieTicketBooking
│       ├── MovieBooking.Api             # Controllers, SignalR hub, middleware, DI wiring, Program.cs
│       ├── MovieBooking.Application     # CQRS commands/queries, MediatR handlers, DTOs, validators, interfaces
│       ├── MovieBooking.Domain          # Entities, enums, domain exceptions — zero external dependencies
│       ├── MovieBooking.Infrastructure  # EF Core, repositories, Stripe/SMTP/JWT services, background jobs
│       ├── MovieBooking.Application.Tests
│       └── MovieTicketBooking.sln
├── frontend
│   ├── app                              # Next.js App Router pages (movies, theatres, checkout, dashboard, admin)
│   ├── components                       # Reusable UI (layout, primitives)
│   └── lib                              # API client, hooks, Zustand stores, types
├── docs                                 # Architecture diagrams and screenshots (for this README)
├── docker-compose.yml                   # SQL Server + API + frontend, containerized
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- **.NET 8 SDK**
- **Node.js 20+**
- **Docker Desktop** (for SQL Server, or the full containerized stack)

### 1 — Database

```bash
docker compose up sqlserver -d
```

*(Or point `backend/MovieTicketBooking/MovieBooking.Api/appsettings.Development.json` at your own SQL Server instance.)*

### 2 — Backend API

```bash
cd backend/MovieTicketBooking/MovieBooking.Api
cp .env.example .env   # fill in Stripe keys + a JWT signing key
dotnet run
```

EF Core migrations and seed data run automatically on startup. Swagger UI: `http://localhost:5000`.

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### 🐳 Or run the full stack in Docker

```bash
docker compose up --build -d
```

| Service | URL |
| :--- | :--- |
| Frontend | `http://localhost:3000` |
| API / Swagger | `http://localhost:5000` |

---

## 🔑 Test Credentials

Seeded automatically on first run:

| Role | Email | Password |
| :--- | :--- | :--- |
| Admin | `admin@movietick.com` | `Admin@123456` |
| Customer | `john.doe@movietick.com` | `User@123456` |

---

## ✅ Testing

Backend handlers are unit tested with **xUnit + Moq** (`MovieBooking.Application.Tests`):

```bash
cd backend/MovieTicketBooking
dotnet test
```

Tests run automatically in CI on every push and pull request (see [Deployment](#️-deployment) below). Current coverage focuses on auth, admin, and movie-rating handlers; extending it to the booking/payment handlers is on the roadmap.

---

## ☁️ Deployment

CinePass is deployed live on **Microsoft Azure** (backend + database) and **Vercel** (frontend), with a fully automated **CI/CD pipeline** on GitHub Actions. The whole stack runs on free tiers — **$0/month** by design, since it exists to be demoed rather than to serve production traffic.

### Architecture

| Component | Hosted on | Link |
| :--- | :--- | :--- |
| **Frontend** (Next.js 16) | Vercel — auto-deploys on every push to `master` | [cine-pass-movie-ticket-booking.vercel.app](https://cine-pass-movie-ticket-booking.vercel.app) |
| **Backend API + SignalR hub** (ASP.NET Core 8) | Azure App Service (Linux, F1 free tier) | [cinepass-api-sachintha26.azurewebsites.net](https://cinepass-api-sachintha26.azurewebsites.net/api/v1/movies) |
| **Database** (SQL Server) | Azure SQL Database (free offer, serverless) | — |
| **CI/CD** | GitHub Actions | [Actions tab](https://github.com/sachinthacham/CinePass-MovieTicketBooking/actions) |

### CI/CD pipeline

| Workflow | Trigger | What it does |
| :--- | :--- | :--- |
| [`backend-ci-cd.yml`](.github/workflows/backend-ci-cd.yml) | Push to `master` touching `backend/**`, or manual run | Restore → build → run xUnit tests → `dotnet publish` → sign in to Azure via OIDC → deploy to App Service |
| [`frontend-ci.yml`](.github/workflows/frontend-ci.yml) | Push / PR touching `frontend/**` | `npm ci` → lint → type-check → production build (Vercel handles the actual deploy) |
| [`keep-warm.yml`](.github/workflows/keep-warm.yml) | Every 10 minutes | Pings the live API so the free-tier app and database never go cold — recruiters get an instant response, not a 30s cold start |

**Passwordless deploys with OIDC** — the backend workflow authenticates to Azure using OpenID Connect federation instead of a stored secret: GitHub proves its identity to Azure AD at runtime and receives a short-lived token, so there is no long-lived Azure credential in the repo or in GitHub Secrets to leak or rotate.

### Infrastructure as code

The Azure resources (resource group, App Service plan, Web App, SQL server + database, app settings, and the OIDC federated credential) are provisioned by a single script: [`deploy/azure-provision.sh`](deploy/azure-provision.sh). The step-by-step runbook — including troubleshooting notes for real issues hit along the way (region-restricted student subscriptions, OIDC subject claims for renamed repos, SQL credential drift) — is in [`deploy/README.md`](deploy/README.md).

### Free-tier trade-offs

- The App Service free tier unloads idle apps after ~20 minutes; the keep-warm workflow above prevents that.
- 60 CPU-minutes/day and 5 concurrent WebSocket connections — plenty for a demo, not for real traffic.
- Stripe runs in **test mode** (use [Stripe's test cards](https://docs.stripe.com/testing)); no real payments are processed.

## 🗺️ Roadmap

- [x] CI/CD pipeline (GitHub Actions) — build, test, and deploy on every push
- [ ] Unit tests for `CreateBookingHandler`, `ConfirmBookingHandler`, and `LockSeatsHandler`
- [ ] Pagination on list endpoints
- [ ] Integration tests against a containerized SQL Server

---

## 🛡️ License

Licensed under the [MIT License](LICENSE).

---

## 🌐 Live Demo

**Try it now: [cine-pass-movie-ticket-booking.vercel.app](https://cine-pass-movie-ticket-booking.vercel.app)**

- **Frontend:** https://cine-pass-movie-ticket-booking.vercel.app
- **Backend API:** https://cinepass-api-sachintha26.azurewebsites.net/api/v1/movies
- **Source code:** https://github.com/sachinthacham/CinePass-MovieTicketBooking

Sign in with the seeded demo accounts from [Test Credentials](#-test-credentials) — `admin@movietick.com` / `Admin@123456` for the admin dashboard, or `john.doe@movietick.com` / `User@123456` to browse and book as a customer.
