#!/usr/bin/env bash
# One-time setup: provisions the Azure resources for CinePass and wires up
# GitHub Actions OIDC so the backend-ci-cd.yml workflow can deploy without
# ever storing an Azure credential as a GitHub secret.
#
# Prerequisites:
#   - Azure CLI installed and logged in: `az login`
#   - You are on the subscription your $100 student credit is attached to
#     (check with `az account show`, switch with `az account set --subscription <id>`)
#
# This is a starting point, not a black box — read it before running it.
# Azure CLI syntax shifts between versions; if any command errors, run it with
# `--help` first (e.g. `az sql db create --help`) to check current flag names.
#
# Usage:
#   chmod +x deploy/azure-provision.sh
#   ./deploy/azure-provision.sh

set -euo pipefail

# Running this under Git Bash on Windows: without this, MSYS silently rewrites
# any argument starting with "/" (like an Azure resource scope "/subscriptions/...")
# into a Windows filesystem path, which breaks every `--scope` argument below.
export MSYS_NO_PATHCONV=1

# ── Fill these in before running ─────────────────────────────────────────
RESOURCE_GROUP="cinepass-rg"
LOCATION="eastasia"                                # this student subscription is policy-restricted to: malaysiawest, indonesiacentral, eastasia, indiasouthcentral, uaenorth
APP_SERVICE_PLAN="cinepass-plan"
WEBAPP_NAME="cinepass-api-sachintha26"              # must be globally unique — becomes cinepass-api-sachintha26.azurewebsites.net
SQL_SERVER_NAME="cinepass-sql-sachintha26"          # must be globally unique
SQL_DB_NAME="MovieBookingDB"
SQL_ADMIN_USER="cinepassadmin"
# Never hardcode this — pass it as an env var at run time so the real value
# never ends up committed to a public repo: SQL_ADMIN_PASSWORD='...' ./deploy/azure-provision.sh
SQL_ADMIN_PASSWORD="${SQL_ADMIN_PASSWORD:?Set SQL_ADMIN_PASSWORD as an env var before running this script}"
FRONTEND_URL="https://CHANGE-ME.vercel.app"         # your Vercel URL, once you have it
GITHUB_ORG="sachinthacham"
GITHUB_REPO="CinePass-MovieTicketBooking"
GITHUB_BRANCH="master"

echo "== 1/6  Resource group =="
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

echo "== 2/6  App Service plan (Linux, F1 — free forever, \$0/month) =="
# F1 has real limits: the app unloads after ~20 min idle (next request is a
# 10-30s cold start), a 60 CPU-minute/day budget, and WebSocket connections
# capped at 5 concurrent — all fine for a demo nobody but interviewers visits.
# It also means this keeps running for free long after the student credit
# expires. Your $100 credit stays untouched as a buffer for other learning.
az appservice plan create \
  --name "$APP_SERVICE_PLAN" \
  --resource-group "$RESOURCE_GROUP" \
  --is-linux \
  --sku F1

echo "== 3/6  Web App (deployed as published .NET code, not a container — F1 doesn't reliably support custom containers) =="
az webapp create \
  --name "$WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_SERVICE_PLAN" \
  --runtime "DOTNETCORE:8.0"

# Always On requires Basic tier or above, so it's skipped here — F1 apps idle
# out and cold-start on the next request, which is the trade-off for $0/month.
az webapp config set \
  --name "$WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --web-sockets-enabled true

echo "== 4/6  Azure SQL Database — free offer (auto-pauses instead of billing past the free limit) =="
az sql server create \
  --name "$SQL_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --admin-user "$SQL_ADMIN_USER" \
  --admin-password "$SQL_ADMIN_PASSWORD"

# Lets Azure services (your Web App) reach the SQL server.
az sql server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --server "$SQL_SERVER_NAME" \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

az sql db create \
  --resource-group "$RESOURCE_GROUP" \
  --server "$SQL_SERVER_NAME" \
  --name "$SQL_DB_NAME" \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 2 \
  --compute-model Serverless \
  --backup-storage-redundancy Local \
  --use-free-limit \
  --free-limit-exhaustion-behavior AutoPause

echo "== 5/6  App settings — connection string + JWT key (fill in Stripe/SMTP yourself, see below) =="
CONN_STRING="Server=tcp:${SQL_SERVER_NAME}.database.windows.net,1433;Database=${SQL_DB_NAME};User ID=${SQL_ADMIN_USER};Password=${SQL_ADMIN_PASSWORD};Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;"
JWT_KEY=$(openssl rand -base64 64 | tr -d '\n')

az webapp config appsettings set \
  --name "$WEBAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    ConnectionStrings__DefaultConnection="$CONN_STRING" \
    Jwt__Key="$JWT_KEY" \
    Jwt__Issuer="MovieBookingApi" \
    Jwt__Audience="MovieBookingClient" \
    Frontend__BaseUrl="$FRONTEND_URL" \
    Booking__LockDurationMinutes=10 \
    Booking__ExpiryMinutes=15

echo ""
echo "Still need to set these yourself (they're secrets — don't put real values in this script):"
echo "  az webapp config appsettings set --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP --settings \\"
echo "    Stripe__SecretKey=sk_test_... Stripe__WebhookSecret=whsec_... Stripe__PublishableKey=pk_test_... \\"
echo "    Smtp__Username=you@gmail.com Smtp__Password=<gmail app password> Smtp__FromEmail=you@gmail.com"

echo "== 6/6  GitHub Actions OIDC federation (no long-lived Azure secret ever stored in GitHub) =="
APP_ID=$(az ad app create --display-name "cinepass-github-deploy" --query appId -o tsv)
az ad sp create --id "$APP_ID"

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}"

az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters "{
    \"name\": \"github-master-branch\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/${GITHUB_BRANCH}\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

TENANT_ID=$(az account show --query tenantId -o tsv)

echo ""
echo "=================================================================="
echo "Add these as GitHub Actions secrets:"
echo "  Repo -> Settings -> Secrets and variables -> Actions -> New repository secret"
echo ""
echo "  AZURE_CLIENT_ID       = $APP_ID"
echo "  AZURE_TENANT_ID       = $TENANT_ID"
echo "  AZURE_SUBSCRIPTION_ID = $SUBSCRIPTION_ID"
echo "  AZURE_WEBAPP_NAME     = $WEBAPP_NAME"
echo ""
echo "Web App URL: https://${WEBAPP_NAME}.azurewebsites.net"
echo "=================================================================="
