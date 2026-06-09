FROM node:25-alpine AS builder

WORKDIR /app

RUN apk add --no-cache alpine-sdk python3
RUN npm install -g pnpm@latest

ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/ scripts/
RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .

# Must be present at build time for $env/static/public (SvelteKit).
ARG PUBLIC_BRAND_NAME=ZooMeet
ARG PUBLIC_ENABLE_TRACKING=false
ENV PUBLIC_BRAND_NAME=${PUBLIC_BRAND_NAME}
ENV PUBLIC_ENABLE_TRACKING=${PUBLIC_ENABLE_TRACKING}

RUN pnpm run build

FROM node:25-alpine

WORKDIR /app

COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .

EXPOSE 3000

ENV NODE_ENV=production

CMD [ "node", "build" ]
