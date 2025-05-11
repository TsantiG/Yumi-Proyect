import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { recetas, dietas } from "../../../db/schema"
import { eq } from "drizzle-orm"
import { sql } from "drizzle-orm"

// GET: Obtener todas las recetas de una dieta específica
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Verificar si la dieta existe
    const dieta = await db.query.dietas.findFirst({
      where: eq(dietas.id, id),
    })

    if (!dieta) {
      return NextResponse.json({ error: "Dieta no encontrada" }, { status: 404 })
    }

    // Obtener recetas de la dieta con paginación
    const recetasDieta = await db.query.recetas.findMany({
      where: eq(recetas.dietaId, id),
      with: {
        autor: true,
        categoria: true,
        puntuaciones: true,
      },
      limit,
      offset,
    })

    // Calcular puntuación promedio para cada receta
    const recetasConPuntuacion = recetasDieta.map((receta) => {
      const puntuaciones = receta.puntuaciones || []
      const totalPuntuaciones = puntuaciones.length
      const sumaPuntuaciones = puntuaciones.reduce((sum, p) => sum + p.puntuacion, 0)
      const promedioPuntuacion = totalPuntuaciones > 0 ? sumaPuntuaciones / totalPuntuaciones : 0

      return {
        ...receta,
        puntuacionPromedio: promedioPuntuacion,
        totalPuntuaciones,
      }
    })

    // Contar total para paginación
    const [{ count }] = await db.select({ count: sql`count(*)` }).from(recetas).where(eq(recetas.dietaId, id))

    return NextResponse.json({
      dieta,
      recetas: recetasConPuntuacion,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error(`Error al obtener recetas de la dieta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener recetas de la dieta" }, { status: 500 })
  }
}

