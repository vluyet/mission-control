FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM base AS dev

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM base AS release

ENV NODE_ENV=production
ENV NEXT_DIST_DIR=.next-build

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run db:deploy && npm run start"]
