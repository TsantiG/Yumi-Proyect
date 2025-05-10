import { NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { recetas, usuarios, ingredientes, comentarios, puntuaciones } from "../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs"

// GET: Obtener una receta específica con sus detalles
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    // Obtener receta con relaciones
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, id),
      with: {
        autor: true,
        ingredientes: true,
        comentarios: {
          with: {
            usuario: true
          },
          orderBy: (comentarios, { desc }) => [desc(comentarios.fecha)]
        },
        infoNutricional: true,
        dieta: true
      }
    })
    
    if (!receta) {
      return NextResponse.json(
        { error: "Receta no encontrada" },
        { status: 404 }
      )
    }
    
    // Calcular puntuación promedio
    const puntuacionPromedio = await db.select({
      promedio: sql`AVG(puntuacion)`,
      total: sql`COUNT(*)`
    })
    .from(puntuaciones)
    .where(eq(puntuaciones.recetaId, id))
    
    // Añadir puntuación a la respuesta
    const recetaConPuntuacion = {
      ...receta,
      puntuacion: {
        promedio: puntuacionPromedio[0].promedio || 0,
        total: puntuacionPromedio[0].total || 0
      }
    }
    
    return NextResponse.json(recetaConPuntuacion)
  } catch (error) {
    console.error(`Error al obtener receta ${params.id}:`, error)
    return NextResponse.json(
      { error: "Error al obtener receta" },
      { status: 500 }
    )
  }
}

// PUT: Actualizar una receta
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    // Verificar autenticación
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }
    
    // Obtener usuario
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId)
    })
    
    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }
    
    // Obtener receta actual
    const recetaActual = await db.query.recetas.findFirst({
      where: eq(recetas.id, id)
    })
    
    if (!recetaActual) {
      return NextResponse.json(
        { error: "Receta no encontrada" },
        { status: 404 }
      )
    }
    
    // Verificar que el usuario es el autor
    if (recetaActual.autorId !== usuario.id) {
      return NextResponse.json(
        { error: "No tienes permiso para editar esta receta" },
        { status: 403 }
      )
    }
    
    // Obtener datos actualizados
    const body = await request.json()
    
    // Actualizar receta
    const recetaActualizada = await db.update(recetas)
      .set({
        titulo: body.titulo || recetaActual.titulo,
        descripcion: body.descripcion || recetaActual.descripcion,
        instrucciones: body.instrucciones || recetaActual.instrucciones,
        tiempoPreparacion: body.tiempoPreparacion || recetaActual.tiempoPreparacion,
        tiempoCoccion: body.tiempoCoccion || recetaActual.tiempoCoccion,
        porciones: body.porciones || recetaActual.porciones,
        dificultad: body.dificultad || recetaActual.dificultad,
        caloriasPorPorcion: body.caloriasPorPorcion || recetaActual.caloriasPorPorcion,
        imagenUrl: body.imagenUrl || recetaActual.imagenUrl,
        dietaId: body.dietaId || recetaActual.dietaId,
        fechaActualizacion: new Date()
      })
      .where(eq(recetas.id, id))
      .returning()
    
    return NextResponse.json(recetaActualizada[0])
  } catch (error) {
    console.error(`Error al actualizar receta ${params.id}:`, error)
    return NextResponse.json(
      { error: "Error al actualizar receta" },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar una receta
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    // Verificar autenticación
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }
    
    // Obtener usuario
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId)
    })
    
    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }
    
    // Obtener receta actual
    const recetaActual = await db.query.recetas.findFirst({
      where: eq(recetas.id, id)
    })
    
    if (!recetaActual) {
      return NextResponse.json(
        { error: "Receta no encontrada" },
        { status: 404 }
      )
    }
    
    // Verificar que el usuario es el autor
    if (recetaActual.autorId !== usuario.id) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar esta receta" },
        { status: 403 }
      )
    }
    
    // Eliminar receta
    await db.delete(recetas).where(eq(recetas.id, id))
    
    return NextResponse.json(
      { message: "Receta eliminada correctamente" },
      { status: 200 }
    )
  } catch (error) {
    console.error(`Error al eliminar receta ${params.id}:`, error)
    return NextResponse.json(
      { error: "Error al eliminar receta" },
      { status: 500 }
    )
  }
}