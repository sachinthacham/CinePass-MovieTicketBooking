# Deploying CinePass — runbook

Architecture: **Vercel** (frontend) + **Azure App Service, Linux, F1 (free)** (backend) + **Azure SQL Database, free offer**. CI/CD via GitHub Actions, deploying with OIDC (no Azure credentials stored as GitHub secrets).

This whole stack costs **$0/month** — both the F1 App Service plan and the SQL Database free offer are "always free," not time-limited trials. Your $100 student credit stays untouched, as a buffer for whatever else you want to try in Azure later. That's a deliberate trade for a project that exists to be looked at by interviewers, not used by real traffic:

- F1 apps **unload after ~20 minutes of no requests** — the next request is a 10-30s cold start. `.github/workflows/keep-warm.yml` pings the live API every 10 minutes specifically to prevent this, so a recruiter clicking the link cold still gets an instant response — at zero added cost (a ping is a fraction of a second of CPU, nowhere near the daily budget below).
- **60 CPU-minutes/day** budget — irrelevant at demo-only traffic levels, and the keep-warm pings use only a few seconds of it total per day.
- **WebSocket connections capped at 5 concurrent** — fine for you + one interviewer, not for real users.
- Azure SQL's serverless free tier **auto-pauses** after inactivity too — same cold-start idea, on the database side. The keep-warm ping hits `/api/v1/movies` (a real DB query), so it keeps the database warm as well, not just the App Service.

None of that is a flaw to hide — it's a legitimate answer to "why F1 and not something bigger": *this project needs a stable link for a job search, not production traffic, so I optimized for it costing nothing indefinitely rather than for performance I don't need.*

If you ever want the smoother version (Always On, no caps) for a specific presentation, bump the plan for that day and drop back down after:
```bash
az appservice plan update --name cinepass-plan --resource-group cinepass-rg --sku B1   # ~$0.018/hour while it's up
az appservice plan update --name cinepass-plan --resource-group cinepass-rg --sku F1   # back to $0
```

## One-time setup

### 1. Provision Azure resources

```bash
az login
az account set --subscription "<your student subscription id>"
chmod +x deploy/azure-provision.sh
# edit the CHANGE-ME values at the top of the script first
./deploy/azure-provision.sh
```

This creates the resource group, App Service plan (F1) + Web App (deployed as published .NET code, not a container — F1 doesn't reliably support custom containers), Azure SQL server + free-offer database, sets the connection string and JWT key as App Settings, and sets up GitHub OIDC federation. It prints the GitHub secrets to add at the end.

### 2. Add the GitHub secrets it prints

Repo → **Settings → Secrets and variables → Actions**:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_WEBAPP_NAME`

### 3. Set the remaining app secrets (Stripe, SMTP)

The provisioning script deliberately doesn't hardcode these — set them directly:

```bash
az webapp config appsettings set --name <your-webapp-name> --resource-group cinepass-rg --settings \
  Stripe__SecretKey=sk_test_... \
  Stripe__WebhookSecret=whsec_... \
  Stripe__PublishableKey=pk_test_... \
  Smtp__Username=you@gmail.com \
  Smtp__Password="<gmail app password, not your login password>" \
  Smtp__FromEmail=you@gmail.com \
  Smtp__FromName=CinePass
```

Use **Stripe test mode** keys — this is a portfolio demo, not a real storefront, and test mode is free with no risk of real charges.

### 4. Deploy the frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import this GitHub repo → set **Root Directory** to `frontend`.
2. Add environment variable `NEXT_PUBLIC_API_URL` = `https://<your-webapp-name>.azurewebsites.net/api/v1`.
3. Deploy. Vercel auto-deploys on every push to `master` from here on — no GitHub Actions step needed for this part; `.github/workflows/frontend-ci.yml` is just the build/lint/type-check gate that runs alongside it.

### 5. Close the loop

- Update the Web App's `Frontend__BaseUrl` app setting to your real Vercel URL (the provisioning script set a placeholder).
- In the [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks), add a webhook endpoint pointing at `https://<your-webapp-name>.azurewebsites.net/api/v1/payments/webhook`, copy its signing secret into `Stripe__WebhookSecret`.
- Push to `master` — `backend-ci-cd.yml` builds, tests, publishes, and deploys automatically from here on.

## What's actually running where

| | |
|---|---|
| Frontend | Vercel, auto-deployed from `master` |
| Backend API + SignalR hub | Azure App Service, F1, deployed by GitHub Actions |
| Database | Azure SQL Database, free-offer serverless |
| CI | `.github/workflows/backend-ci-cd.yml`, `.github/workflows/frontend-ci.yml` |

The repo's `Dockerfile` and `docker-compose.yml` are still there and used for local development — they're just not part of this particular deployment path. Containerizing this deployment too (Azure Container Apps has its own separate "always free" consumption grant, and is a more modern service than App Service) is a reasonable next thing to learn, if you want to go further.

## Explaining this pipeline in an interview

A short version of what's actually happening, worth having ready:

- **CI vs CD, concretely**: `build-and-test` runs on every push *and* every PR — that's the "does this still work" gate. `deploy` only runs after that passes, and only on `master` — that's the "ship it" step. Splitting them means a broken PR never reaches production regardless of what anyone forgets to check manually.
- **Why OIDC instead of a stored Azure password/secret**: the old way was to paste an App Service "publish profile" (long-lived credentials) into a GitHub secret. OIDC instead has GitHub prove its identity to Azure AD at runtime (via a federated credential scoped to `repo:you/repo:ref:refs/heads/master`) and gets back a token valid for that one run only. Nothing long-lived to leak, rotate, or revoke.
- **Why F1 over a paid tier**: this project's job is to be *looked at*, not to serve traffic — optimizing for $0/month forever beats optimizing for performance nobody needs. Also a legitimate cost/scaling trade-off to be able to articulate, not just a corner cut.
- **Why "publish and deploy" instead of Docker here**: the Dockerfile exists and is used for local dev via `docker-compose`, but F1's container support is unreliable, so production deploy uses the plain `dotnet publish` → zip → Azure path instead — the same idea as Docker (build once, ship the same artifact everywhere) without depending on a feature this tier doesn't reliably support.
- **Why the DB didn't need code changes**: `ConnectionStrings:DefaultConnection` was already externalized to config/environment variables before any of this — Azure SQL is still literally SQL Server, so switching the target was a connection-string change, not an EF Core provider swap.
