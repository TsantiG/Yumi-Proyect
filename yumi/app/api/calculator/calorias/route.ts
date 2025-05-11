import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

// POST: Calcular calorías diarias recomendadas
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (opcional)
    const { userId } = await auth()

    // Obtener datos del cuerpo de la solicitud
    const body = await request.json()

    // Validar datos
    if (!body.peso || !body.altura || !body.edad || !body.sexo || !body.actividad || !body.objetivo) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios: peso, altura, edad, sexo, actividad y objetivo" },
        { status: 400 },
      )
    }

    // Convertir valores a números
    const peso = Number(body.peso) // en kg
    const altura = Number(body.altura) // en cm
    const edad = Number(body.edad) // en años
    const sexo = body.sexo.toLowerCase() // 'masculino' o 'femenino'
    const actividad = body.actividad.toLowerCase() // 'sedentario', 'ligero', 'moderado', 'activo', 'muy_activo'
    const objetivo = body.objetivo.toLowerCase() // 'mantener', 'perder_peso', 'ganar_masa'

    // Validar rangos
    if (peso <= 0 || peso > 300) {
      return NextResponse.json({ error: "El peso debe estar entre 1 y 300 kg" }, { status: 400 })
    }

    if (altura <= 0 || altura > 250) {
      return NextResponse.json({ error: "La altura debe estar entre 1 y 250 cm" }, { status: 400 })
    }

    if (edad <= 0 || edad > 120) {
      return NextResponse.json({ error: "La edad debe estar entre 1 y 120 años" }, { status: 400 })
    }

    if (sexo !== "masculino" && sexo !== "femenino") {
      return NextResponse.json({ error: "El sexo debe ser 'masculino' o 'femenino'" }, { status: 400 })
    }

    const actividadesValidas = ["sedentario", "ligero", "moderado", "activo", "muy_activo"]
    if (!actividadesValidas.includes(actividad)) {
      return NextResponse.json(
        { error: "La actividad debe ser 'sedentario', 'ligero', 'moderado', 'activo' o 'muy_activo'" },
        { status: 400 },
      )
    }

    const objetivosValidos = ["mantener", "perder_peso", "ganar_masa"]
    if (!objetivosValidos.includes(objetivo)) {
      return NextResponse.json(
        { error: "El objetivo debe ser 'mantener', 'perder_peso' o 'ganar_masa'" },
        { status: 400 },
      )
    }

    // Calcular TMB (Tasa Metabólica Basal) usando la fórmula de Mifflin-St Jeor
    let tmb
    if (sexo === "masculino") {
      tmb = 10 * peso + 6.25 * altura - 5 * edad + 5
    } else {
      tmb = 10 * peso + 6.25 * altura - 5 * edad - 161
    }

    // Aplicar factor de actividad
    let factorActividad
    switch (actividad) {
      case "sedentario":
        factorActividad = 1.2
        break
      case "ligero":
        factorActividad = 1.375
        break
      case "moderado":
        factorActividad = 1.55
        break
      case "activo":
        factorActividad = 1.725
        break
      case "muy_activo":
        factorActividad = 1.9
        break
      default:
        factorActividad = 1.2
    }

    // Calcular calorías diarias según nivel de actividad
    let caloriasDiarias = tmb * factorActividad

    // Ajustar según objetivo
    let ajusteObjetivo = 0
    switch (objetivo) {
      case "perder_peso":
        ajusteObjetivo = -500 // Déficit de 500 calorías para perder peso
        break
      case "ganar_masa":
        ajusteObjetivo = 500 // Superávit de 500 calorías para ganar masa
        break
      default:
        ajusteObjetivo = 0 // Mantener peso
    }

    caloriasDiarias += ajusteObjetivo

    // Calcular macronutrientes recomendados
    let proteinas, carbohidratos, grasas

    switch (objetivo) {
      case "perder_peso":
        proteinas = (caloriasDiarias * 0.4) / 4 // 40% de proteínas (4 calorías por gramo)
        grasas = (caloriasDiarias * 0.35) / 9 // 35% de grasas (9 calorías por gramo)
        carbohidratos = (caloriasDiarias * 0.25) / 4 // 25% de carbohidratos (4 calorías por gramo)
        break
      case "ganar_masa":
        proteinas = (caloriasDiarias * 0.3) / 4 // 30% de proteínas
        grasas = (caloriasDiarias * 0.25) / 9 // 25% de grasas
        carbohidratos = (caloriasDiarias * 0.45) / 4 // 45% de carbohidratos
        break
      default: // mantener
        proteinas = (caloriasDiarias * 0.3) / 4 // 30% de proteínas
        grasas = (caloriasDiarias * 0.3) / 9 // 30% de grasas
        carbohidratos = (caloriasDiarias * 0.4) / 4 // 40% de carbohidratos
    }

    // Calcular IMC (Índice de Masa Corporal)
    const alturaEnMetros = altura / 100
    const imc = peso / (alturaEnMetros * alturaEnMetros)

    // Determinar categoría de IMC
    let categoriaIMC
    if (imc < 18.5) {
      categoriaIMC = "Bajo peso"
    } else if (imc >= 18.5 && imc < 25) {
      categoriaIMC = "Peso normal"
    } else if (imc >= 25 && imc < 30) {
      categoriaIMC = "Sobrepeso"
    } else {
      categoriaIMC = "Obesidad"
    }

    // Preparar respuesta
    const resultado = {
      tmb: Math.round(tmb),
      caloriasDiarias: Math.round(caloriasDiarias),
      macronutrientes: {
        proteinas: Math.round(proteinas),
        carbohidratos: Math.round(carbohidratos),
        grasas: Math.round(grasas),
      },
      imc: {
        valor: parseFloat(imc.toFixed(2)),
        categoria: categoriaIMC,
      },
      distribucionComidas: {
        desayuno: Math.round(caloriasDiarias * 0.25), // 25% de las calorías diarias
        almuerzo: Math.round(caloriasDiarias * 0.35), // 35% de las calorías diarias
        merienda: Math.round(caloriasDiarias * 0.15), // 15% de las calorías diarias
        cena: Math.round(caloriasDiarias * 0.25), // 25% de las calorías diarias
      },
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error al calcular calorías:", error)
    return NextResponse.json({ error: "Error al calcular calorías" }, { status: 500 })
  }
}



//------------------------se revisara   -------------------------
// import { NextRequest, NextResponse } from "next/server"
// import {db} from "../../db"
// import { ingredientes, recetas } from "../../db/schema"
// import { eq } from "drizzle-orm"

// // POST: Calcular calorías de una receta o ingredientes
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
    
//     // Si se proporciona un ID de receta, calcular calorías de la receta
//     if (body.recetaId) {
//       const ingredientesReceta = await db.query.ingredientes.findMany({
//         where: eq(ingredientes.recetaId, body.recetaId)
//       })
      
//       let totalCalorias = 0
      
//       // Sumar calorías de cada ingrediente
//       for (const ingrediente of ingredientesReceta) {
//         if (ingrediente.caloriasPorUnidad && ingrediente.cantidad) {
//           totalCalorias += ingrediente.caloriasPorUnidad * Number(ingrediente.cantidad)
//         }
//       }
      
//       // Calcular calorías por porción si hay porciones definidas
//       const receta = await db.query.recetas.findFirst({
//         where: eq(recetas.id, body.recetaId)
//       })
//       // -------------------------Atencion------------------------- en la parte de esquemas justo arriba puede haber un error revision por hacer, no te oldides pendejo
//       const caloriasPorPorcion = receta && receta.porciones 
//         ? Math.round(totalCalorias / receta.porciones) 
//         : totalCalorias
      
//       return NextResponse.json({
//         totalCalorias,
//         caloriasPorPorcion,
//         porciones: receta?.porciones || 1
//       })
//     }
    
//     // Si se proporcionan ingredientes directamente
//     else if (body.ingredientes && Array.isArray(body.ingredientes)) {
//       let totalCalorias = 0
      
//       // Sumar calorías de cada ingrediente proporcionado
//       for (const item of body.ingredientes) {
//         if (item.caloriasPorUnidad && item.cantidad) {
//           totalCalorias += item.caloriasPorUnidad * Number(item.cantidad)
//         }
//       }
      
//       // Calcular calorías por porción si se proporciona
//       const caloriasPorPorcion = body.porciones 
//         ? Math.round(totalCalorias / body.porciones) 
//         : totalCalorias
      
//       return NextResponse.json({
//         totalCalorias,
//         caloriasPorPorcion,
//         porciones: body.porciones || 1
//       })
//     }
    
//     else {
//       return NextResponse.json(
//         { error: "Se requiere recetaId o lista de ingredientes" },
//         { status: 400 }
//       )
//     }
//   } catch (error) {
//     console.error("Error al calcular calorías:", error)
//     return NextResponse.json(
//       { error: "Error al calcular calorías" },
//       { status: 500 }
//     )
//   }
// }