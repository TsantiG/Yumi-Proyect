import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { recetas, categorias } from "../../../db/schema"
import { eq } from "drizzle-orm"
import { sql } from "drizzle-orm"

// GET: Obtener todas las recetas de una categoría específica
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Verificar si la categoría existe
    const categoria = await db.query.categorias.findFirst({
      where: eq(categorias.id, id),
    })

    if (!categoria) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    // Obtener recetas de la categoría con paginación
    const recetasCategoria = await db.query.recetas.findMany({
      where: eq(recetas.categoriaId, id),
      with: {
        autor: true,
        dieta: true,
        puntuaciones: true,
      },
      limit,
      offset,
    })

    // Calcular puntuación promedio para cada receta
    const recetasConPuntuacion = recetasCategoria.map((receta) => {
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
    const [{ count }] = await db.select({ count: sql`count(*)` }).from(recetas).where(eq(recetas.categoriaId, id))

    return NextResponse.json({
      categoria,
      recetas: recetasConPuntuacion,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error(`Error al obtener recetas de la categoría ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener recetas de la categoría" }, { status: 500 })
  }
}

