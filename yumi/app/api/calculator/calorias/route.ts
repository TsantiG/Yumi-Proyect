import { NextRequest, NextResponse } from "next/server"
import {db} from "../../db"
import { ingredientes, recetas } from "../../db/schema"
import { eq } from "drizzle-orm"

// POST: Calcular calorías de una receta o ingredientes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Si se proporciona un ID de receta, calcular calorías de la receta
    if (body.recetaId) {
      const ingredientesReceta = await db.query.ingredientes.findMany({
        where: eq(ingredientes.recetaId, body.recetaId)
      })
      
      let totalCalorias = 0
      
      // Sumar calorías de cada ingrediente
      for (const ingrediente of ingredientesReceta) {
        if (ingrediente.caloriasPorUnidad && ingrediente.cantidad) {
          totalCalorias += ingrediente.caloriasPorUnidad * Number(ingrediente.cantidad)
        }
      }
      
      // Calcular calorías por porción si hay porciones definidas
      const receta = await db.query.recetas.findFirst({
        where: eq(recetas.id, body.recetaId)
      })
      // -------------------------Atencion------------------------- en la parte de esquemas justo arriba puede haber un error revision por hacer, no te oldides pendejo
      const caloriasPorPorcion = receta && receta.porciones 
        ? Math.round(totalCalorias / receta.porciones) 
        : totalCalorias
      
      return NextResponse.json({
        totalCalorias,
        caloriasPorPorcion,
        porciones: receta?.porciones || 1
      })
    }
    
    // Si se proporcionan ingredientes directamente
    else if (body.ingredientes && Array.isArray(body.ingredientes)) {
      let totalCalorias = 0
      
      // Sumar calorías de cada ingrediente proporcionado
      for (const item of body.ingredientes) {
        if (item.caloriasPorUnidad && item.cantidad) {
          totalCalorias += item.caloriasPorUnidad * Number(item.cantidad)
        }
      }
      
      // Calcular calorías por porción si se proporciona
      const caloriasPorPorcion = body.porciones 
        ? Math.round(totalCalorias / body.porciones) 
        : totalCalorias
      
      return NextResponse.json({
        totalCalorias,
        caloriasPorPorcion,
        porciones: body.porciones || 1
      })
    }
    
    else {
      return NextResponse.json(
        { error: "Se requiere recetaId o lista de ingredientes" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error al calcular calorías:", error)
    return NextResponse.json(
      { error: "Error al calcular calorías" },
      { status: 500 }
    )
  }
}