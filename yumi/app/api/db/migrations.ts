// Este archivo se usaría para ejecutar migraciones manualmente

import { migrate } from "drizzle-orm/neon-http/migrator"
import { db } from "./index"

// Función para ejecutar migraciones
export async function runMigrations() {
  try {
    console.log("Ejecutando migraciones...")

    // Ejecutar migraciones desde la carpeta drizzle
    await migrate(db, { migrationsFolder: "drizzle" })

    console.log("Migraciones completadas con éxito")
    return { success: true }
  } catch (error) {
    console.error("Error al ejecutar migraciones:", error)
    return { success: false, error }
  }
}

// Para ejecutar migraciones desde un script:
// Si este archivo se ejecuta directamente
if (require.main === module) {
  runMigrations()
    .then((result) => {
      if (result.success) {
        process.exit(0)
      } else {
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error("Error inesperado:", error)
      process.exit(1)
    })
}
