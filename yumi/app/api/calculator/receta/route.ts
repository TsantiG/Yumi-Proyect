import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { recetas, ingredientes, infoNutricional } from "../../db/schema"
import { eq } from "drizzle-orm"

// POST: Calcular información nutricional de una receta
export async function POST(request: NextRequest) {
  try {
    // Obtener datos del cuerpo de la solicitud
    const body = await request.json()

    // Validar datos
    if (!body.ingredientes || !Array.isArray(body.ingredientes)) {
      return NextResponse.json({ error: "Se requiere un array de ingredientes" }, { status: 400 })
    }

    // Validar cada ingrediente
    for (const ingrediente of body.ingredientes) {
      if (!ingrediente.nombre || !ingrediente.cantidad || !ingrediente.unidad) {
        return NextResponse.json(
          { error: "Cada ingrediente debe tener nombre, cantidad y unidad" },
          { status: 400 },
        )
      }
    }

    // Porciones de la receta
    const porciones = body.porciones || 1

    // Calcular calorías y macronutrientes totales
    let caloriasTotales = 0
    let proteinasTotales = 0
    let carbohidratosTotales = 0
    let grasasTotales = 0
    let fibraTotales = 0
    let azucaresTotales = 0

    // Procesar cada ingrediente
    const ingredientesConInfo = []
    for (const ingrediente of body.ingredientes) {
      // Aquí deberías tener una base de datos de ingredientes con información nutricional
      // Por ahora, usaremos valores aproximados basados en el nombre del ingrediente

      // Buscar ingrediente en la base de datos (simulado)
      let infoIngrediente = await buscarIngredienteEnBaseDeDatos(ingrediente.nombre)

      if (!infoIngrediente) {
        // Si no se encuentra, usar valores predeterminados
        infoIngrediente = {
          calorias: 100, // calorías por 100g/ml
          proteinas: 5, // g por 100g/ml
          carbohidratos: 10, // g por 100g/ml
          grasas: 5, // g por 100g/ml
          fibra: 2, // g por 100g/ml
          azucares: 2, // g por 100g/ml
        }
      }

      // Calcular factor de conversión según la unidad
      let factorConversion = 1
      if (ingrediente.unidad === "g" || ingrediente.unidad === "ml") {
        factorConversion = ingrediente.cantidad / 100 // la info nutricional es por 100g/ml
      } else if (ingrediente.unidad === "kg" || ingrediente.unidad === "l") {
        factorConversion = (ingrediente.cantidad * 1000) / 100 // convertir a g/ml y luego dividir por 100
      } else if (ingrediente.unidad === "cucharada") {
        factorConversion = (ingrediente.cantidad * 15) / 100 // aprox. 15g por cucharada
      } else if (ingrediente.unidad === "cucharadita") {
        factorConversion = (ingrediente.cantidad * 5) / 100 // aprox. 5g por cucharadita
      } else if (ingrediente.unidad === "taza") {
        factorConversion = (ingrediente.cantidad * 240) / 100 // aprox. 240ml por taza
      } else if (ingrediente.unidad === "unidad") {
        factorConversion = ingrediente.cantidad // depende del ingrediente, usar valor predeterminado
      }

      // Calcular valores nutricionales para este ingrediente
      const caloriasIngrediente = infoIngrediente.calorias * factorConversion
      const proteinasIngrediente = infoIngrediente.proteinas * factorConversion
      const carbohidratosIngrediente = infoIngrediente.carbohidratos * factorConversion
      const grasasIngrediente = infoIngrediente.grasas * factorConversion
      const fibraIngrediente = infoIngrediente.fibra * factorConversion
      const azucaresIngrediente = infoIngrediente.azucares * factorConversion

      // Sumar al total
      caloriasTotales += caloriasIngrediente
      proteinasTotales += proteinasIngrediente
      carbohidratosTotales += carbohidratosIngrediente
      grasasTotales += grasasIngrediente
      fibraTotales += fibraIngrediente
      azucaresTotales += azucaresIngrediente

      // Añadir a la lista de ingredientes con información
      ingredientesConInfo.push({
        ...ingrediente,
        infoNutricional: {
          calorias: Math.round(caloriasIngrediente),
          proteinas: parseFloat(proteinasIngrediente.toFixed(1)),
          carbohidratos: parseFloat(carbohidratosIngrediente.toFixed(1)),
          grasas: parseFloat(grasasIngrediente.toFixed(1)),
          fibra: parseFloat(fibraIngrediente.toFixed(1)),
          azucares: parseFloat(azucaresIngrediente.toFixed(1)),
        },
      })
    }

    // Calcular valores por porción
    const caloriasPorPorcion = caloriasTotales / porciones
    const proteinasPorPorcion = proteinasTotales / porciones
    const carbohidratosPorPorcion = carbohidratosTotales / porciones
    const grasasPorPorcion = grasasTotales / porciones
    const fibraPorPorcion = fibraTotales / porciones
    const azucaresPorPorcion = azucaresTotales / porciones

    // Preparar respuesta
    const resultado = {
      total: {
        calorias: Math.round(caloriasTotales),
        proteinas: parseFloat(proteinasTotales.toFixed(1)),
        carbohidratos: parseFloat(carbohidratosTotales.toFixed(1)),
        grasas: parseFloat(grasasTotales.toFixed(1)),
        fibra: parseFloat(fibraTotales.toFixed(1)),
        azucares: parseFloat(azucaresTotales.toFixed(1)),
      },
      porPorcion: {
        calorias: Math.round(caloriasPorPorcion),
        proteinas: parseFloat(proteinasPorPorcion.toFixed(1)),
        carbohidratos: parseFloat(carbohidratosPorPorcion.toFixed(1)),
        grasas: parseFloat(grasasPorPorcion.toFixed(1)),
        fibra: parseFloat(fibraPorPorcion.toFixed(1)),
        azucares: parseFloat(azucaresPorPorcion.toFixed(1)),
      },
      porciones,
      ingredientes: ingredientesConInfo,
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error al calcular información nutricional:", error)
    return NextResponse.json({ error: "Error al calcular información nutricional" }, { status: 500 })
  }
}

// Función para buscar un ingrediente en la base de datos (simulada)
async function buscarIngredienteEnBaseDeDatos(nombre: string) {
  // Aquí deberías implementar la búsqueda real en tu base de datos
  // Por ahora, devolvemos algunos valores predefinidos para ingredientes comunes

  const ingredientesComunes: Record<string, any> = {
    arroz: {
      calorias: 130,
      proteinas: 2.7,
      carbohidratos: 28,
      grasas: 0.3,
      fibra: 0.4,
      azucares: 0.1,
    },
    pollo: {
      calorias: 165,
      proteinas: 31,
      carbohidratos: 0,
      grasas: 3.6,
      fibra: 0,
      azucares: 0,
    },
    "aceite de oliva": {
      calorias: 884,
      proteinas: 0,
      carbohidratos: 0,
      grasas: 100,
      fibra: 0,
      azucares: 0,
    },
    zanahoria: {
      calorias: 41,
      proteinas: 0.9,
      carbohidratos: 10,
      grasas: 0.2,
      fibra: 2.8,
      azucares: 4.7,
    },
    cebolla: {
      calorias: 40,
      proteinas: 1.1,
      carbohidratos: 9.3,
      grasas: 0.1,
      fibra: 1.7,
      azucares: 4.2,
    },
    tomate: {
      calorias: 18,
      proteinas: 0.9,
      carbohidratos: 3.9,
      grasas: 0.2,
      fibra: 1.2,
      azucares: 2.6,
    },
    lechuga: {
      calorias: 15,
      proteinas: 1.4,
      carbohidratos: 2.9,
      grasas: 0.2,
      fibra: 1.3,
      azucares: 0.8,
    },
    huevo: {
      calorias: 155,
      proteinas: 12.6,
      carbohidratos: 1.1,
      grasas: 10.6,
      fibra: 0,
      azucares: 1.1,
    },
    leche: {
      calorias: 42,
      proteinas: 3.4,
      carbohidratos: 5,
      grasas: 1,
      fibra: 0,
      azucares: 5,
    },
    pan: {
      calorias: 265,
      proteinas: 9.4,
      carbohidratos: 49,
      grasas: 3.2,
      fibra: 2.7,
      azucares: 5,
    },
  }

  // Buscar coincidencia parcial en el nombre
  const nombreLower = nombre.toLowerCase()
  for (const [key, value] of Object.entries(ingredientesComunes)) {
    if (nombreLower.includes(key) || key.includes(nombreLower)) {
      return value
    }
  }

  // Si no se encuentra, devolver null
  return null
}

