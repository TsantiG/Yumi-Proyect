// Este archivo se usaría para poblar la base de datos con datos iniciales
import { db } from "./index"
import { categorias, dietas, unidadesMedida, conversiones } from "./schema"


export async function seedDatabase() {
  try {
    console.log("Iniciando población de datos iniciales...")

    // Insertar categorías básicas
    await db.insert(categorias).values([
      { nombre: "Desayuno", descripcion: "Recetas para el desayuno" },
      { nombre: "Almuerzo", descripcion: "Recetas para el almuerzo" },
      { nombre: "Cena", descripcion: "Recetas para la cena" },
      { nombre: "Postres", descripcion: "Recetas de postres" },
      { nombre: "Bebidas", descripcion: "Recetas de bebidas" },
      { nombre: "Snacks", descripcion: "Recetas de aperitivos y snacks" },
    ])

    // Insertar dietas comunes
    await db.insert(dietas).values([
      {
        nombre: "Vegetariana",
        descripcion: "Sin carne pero con productos animales como huevos y lácteos",
        restricciones: "Sin carne",
      },
      { nombre: "Vegana", descripcion: "Sin productos de origen animal", restricciones: "Sin productos animales" },
      {
        nombre: "Sin gluten",
        descripcion: "Sin ingredientes que contengan gluten",
        restricciones: "Sin trigo, cebada, centeno",
      },
      {
        nombre: "Keto",
        descripcion: "Alta en grasas, moderada en proteínas y baja en carbohidratos",
        restricciones: "Bajo en carbohidratos",
      },
      {
        nombre: "Paleo",
        descripcion: "Basada en alimentos presumiblemente consumidos por humanos del Paleolítico",
        restricciones: "Sin procesados, lácteos, granos",
      },
      { nombre: "Sin lácteos", descripcion: "Sin productos lácteos", restricciones: "Sin leche, queso, yogur" },
    ])

    // Insertar unidades de medida
    await db.insert(unidadesMedida).values([
      { nombre: "Gramo", abreviatura: "g", tipo: "peso" },
      { nombre: "Kilogramo", abreviatura: "kg", tipo: "peso" },
      { nombre: "Mililitro", abreviatura: "ml", tipo: "volumen" },
      { nombre: "Litro", abreviatura: "l", tipo: "volumen" },
      { nombre: "Cucharadita", abreviatura: "cdta", tipo: "volumen" },
      { nombre: "Cucharada", abreviatura: "cda", tipo: "volumen" },
      { nombre: "Taza", abreviatura: "taza", tipo: "volumen" },
      { nombre: "Unidad", abreviatura: "u", tipo: "unidad" },
      { nombre: "Pizca", abreviatura: "pizca", tipo: "otro" },
      { nombre: "Al gusto", abreviatura: "al gusto", tipo: "otro" },
    ])

    // Insertar algunas conversiones comunes
    await db.insert(conversiones).values([
      { desdeUnidadId: 1, haciaUnidadId: 2, factorConversion: 0.001 }, // g a kg
      { desdeUnidadId: 2, haciaUnidadId: 1, factorConversion: 1000 }, // kg a g
      { desdeUnidadId: 3, haciaUnidadId: 4, factorConversion: 0.001 }, // ml a l
      { desdeUnidadId: 4, haciaUnidadId: 3, factorConversion: 1000 }, // l a ml
      { desdeUnidadId: 5, haciaUnidadId: 6, factorConversion: 0.333 }, // cdta a cda
      { desdeUnidadId: 6, haciaUnidadId: 5, factorConversion: 3 }, // cda a cdta
      { desdeUnidadId: 6, haciaUnidadId: 7, factorConversion: 0.0625 }, // cda a taza
      { desdeUnidadId: 7, haciaUnidadId: 6, factorConversion: 16 }, // taza a cda
      { desdeUnidadId: 3, haciaUnidadId: 5, factorConversion: 0.2 }, // ml a cdta
      { desdeUnidadId: 5, haciaUnidadId: 3, factorConversion: 5 }, // cdta a ml
    ])

    console.log("Datos iniciales insertados con éxito")
    return { success: true }
  } catch (error) {
    console.error("Error al insertar datos iniciales:", error)
    return { success: false, error }
  }
}

// Para ejecutar el seed desde un script:
if (require.main === module) {
  seedDatabase()
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
