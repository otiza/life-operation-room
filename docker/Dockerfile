# Local production build of Life Room. Targets: `api`, `web`.
FROM node:24-slim AS build
RUN npm install -g pnpm@12.18.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# Baked into the browser bundle: where the browser reaches the API.
ARG NEXT_PUBLIC_API_URL=http://localhost:8081
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm build

FROM build AS api
ENV NODE_ENV=production
WORKDIR /repo/apps/api
EXPOSE 3001
# Apply pending migrations, then serve.
CMD ["sh", "-c", "node ./node_modules/drizzle-kit/bin.cjs migrate && node dist/main.js"]

FROM build AS web
ENV NODE_ENV=production
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "--port", "3000"]
