import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { recetas, puntuaciones, usuarios } from "../../../db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener puntuaciones de una receta
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)

    // Verificar que la receta existe
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, recetaId),
    })

    if (!receta) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    // Obtener puntuaciones con información del usuario
    const puntuacionesReceta = await db.query.puntuaciones.findMany({
      where: eq(puntuaciones.recetaId, recetaId),
      with: {
        usuario: true,
      },
      orderBy: (puntuaciones, { desc }) => [desc(puntuaciones.fecha)],
    })

    // Calcular estadísticas
    const estadisticas = await db
      .select({
        promedio: sql`COALESCE(AVG(puntuacion), 0)`,
        total: sql`COUNT(*)`,
        max: sql`MAX(puntuacion)`,
        min: sql`MIN(puntuacion)`,
        distribucion: sql`
        json_build_object(
          '1', COUNT(*) FILTER (WHERE puntuacion = 1),
          '2', COUNT(*) FILTER (WHERE puntuacion = 2),
          '3', COUNT(*) FILTER (WHERE puntuacion = 3),
          '4', COUNT(*) FILTER (WHERE puntuacion = 4),
          '5', COUNT(*) FILTER (WHERE puntuacion = 5)
        )
      `,
      })
      .from(puntuaciones)
      .where(eq(puntuaciones.recetaId, recetaId))

    return NextResponse.json({
      puntuaciones: puntuacionesReceta,
      estadisticas: {
        promedio: Number(estadisticas[0].promedio),
        total: Number(estadisticas[0].total),
        max: estadisticas[0].max,
        min: estadisticas[0].min,
        distribucion: estadisticas[0].distribucion,
      },
    })
  } catch (error) {
    console.error(`Error al obtener puntuaciones de la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener puntuaciones" }, { status: 500 })
  }
}

// POST: Añadir o actualizar puntuación a una receta
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)

    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener usuario
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar que la receta existe
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, recetaId),
    })

    if (!receta) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    // Obtener datos de la puntuación
    const body = await request.json()

    // Validar datos
    if (!body.puntuacion || body.puntuacion < 1 || body.puntuacion > 5) {
      return NextResponse.json({ error: "La puntuación debe ser un número entre 1 y 5" }, { status: 400 })
    }

    // Verificar si el usuario ya ha puntuado esta receta
    const puntuacionExistente = await db.query.puntuaciones.findFirst({
      where: and(eq(puntuaciones.recetaId, recetaId), eq(puntuaciones.usuarioId, usuario.id)),
    })

    let resultado

    if (puntuacionExistente) {
      // Actualizar puntuación existente
      resultado = await db
        .update(puntuaciones)
        .set({
          puntuacion: body.puntuacion,
          fecha: new Date(),
        })
        .where(eq(puntuaciones.id, puntuacionExistente.id))
        .returning()
    } else {
      // Crear nueva puntuación
      resultado = await db
        .insert(puntuaciones)
        .values({
          recetaId,
          usuarioId: usuario.id,
          puntuacion: body.puntuacion,
          fecha: new Date(),
        })
        .returning()
    }

    // Calcular nueva puntuación promedio
    const [{ promedio, total }] = await db
      .select({
        promedio: sql`COALESCE(AVG(puntuacion), 0)`,
        total: sql`COUNT(*)`,
      })
      .from(puntuaciones)
      .where(eq(puntuaciones.recetaId, recetaId))

    return NextResponse.json(
      {
        puntuacion: resultado[0],
        estadisticas: {
          promedio: Number(promedio),
          total: Number(total),
        },
      },
      { status: puntuacionExistente ? 200 : 201 },
    )
  } catch (error) {
    console.error(`Error al puntuar la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al puntuar la receta" }, { status: 500 })
  }
}

// DELETE: Eliminar puntuación de un usuario
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)

    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener usuario
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar que la puntuación existe
    const puntuacionExistente = await db.query.puntuaciones.findFirst({
      where: and(eq(puntuaciones.recetaId, recetaId), eq(puntuaciones.usuarioId, usuario.id)),
    })

    if (!puntuacionExistente) {
      return NextResponse.json({ error: "No has puntuado esta receta" }, { status: 404 })
    }

    // Eliminar puntuación
    await db.delete(puntuaciones).where(eq(puntuaciones.id, puntuacionExistente.id))

    // Calcular nueva puntuación promedio
    const [{ promedio, total }] = await db
      .select({
        promedio: sql`COALESCE(AVG(puntuacion), 0)`,
        total: sql`COUNT(*)`,
      })
      .from(puntuaciones)
      .where(eq(puntuaciones.recetaId, recetaId))

    return NextResponse.json(
      {
        message: "Puntuación eliminada correctamente",
        estadisticas: {
          promedio: Number(promedio),
          total: Number(total),
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error(`Error al eliminar puntuación de la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar puntuación" }, { status: 500 })
  }
}
