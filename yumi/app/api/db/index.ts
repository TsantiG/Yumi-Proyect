import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

// Verificar que la variable de entorno esté definida
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida")
}

// Crear el cliente de Neon
const sql = neon(process.env.DATABASE_URL)

// Crear la instancia de Drizzle con el esquema
export const db = drizzle(sql, { schema })

// Exportar todo el esquema para uso en la aplicación
export * from "./schema"
