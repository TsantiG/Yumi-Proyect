import * as dotenv from "dotenv"
import { defineConfig } from "drizzle-kit";

dotenv.config()

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida")
}

export default defineConfig({
  schema: "./app/api/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
