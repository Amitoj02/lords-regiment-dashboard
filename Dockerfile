# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build for the Lords Regiment Dashboard (Angular 19).
#   deps  → all npm dependencies
#   dev   → `ng serve` for hot reload (source bind-mounted by the compose dev
#           override; command + proxy config come from there)
#   build → `ng build` (AOT, production) → dist/lords-regiment-dashboard/browser
#   prod  → nginx serving the SPA and reverse-proxying /api to the api container
# This image is the `web` service of the backend repo's docker-compose stack
# (build context ../lords-regiment-dashboard).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Development image: ng serve (command supplied by the compose dev override) ─
FROM node:26-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4200
CMD ["npm", "start", "--", "--host", "0.0.0.0"]

# ── Build the production bundle ──────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build -- --configuration production

# ── Production runtime: nginx (static SPA + /api reverse proxy) ───────────────
FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/lords-regiment-dashboard/browser /usr/share/nginx/html
EXPOSE 80
