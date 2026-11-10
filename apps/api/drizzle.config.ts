import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // Neon: use the direct (non-pooler) URL for migrations; fall back to DATABASE_URL for local Docker.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? 'postgresql://tiza:tiza@localhost:5432/tiza',
  },
});
