import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { recetas, usuarios, categorias, dietas, puntuaciones, dificultadEnum } from "../../db/schema"
import { and, eq, sql } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener recetas aleatorias con filtros opcionales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    type Dificultad = typeof dificultadEnum.enumValues[number]
    
    // Número de recetas a devolver
    const cantidad = Number.parseInt(searchParams.get("cantidad") || "5")

    // Filtros opcionales
    const categoriaId = searchParams.get("categoria")
    const dietaId = searchParams.get("dieta")
    const dificultadParam = searchParams.get("dificultad")
    const dificultadOpciones = ["fácil", "media", "difícil"] as const
    const maxCalorias = searchParams.get("maxCalorias")

    // Verificar autenticación para personalización (opcional)
    const { userId } = await auth()
    let usuarioDb = null

    if (userId) {
      usuarioDb = await db.query.usuarios.findFirst({
        where: eq(usuarios.idClerk, userId),
        with: {
          preferencias: {
            with: {
              categoria: true,
            },
          },
          dietas: {
            with: {
              dieta: true,
            },
          },
          metas: true,
        },
      })
    }

    // Construir filtros
    const filters = []

    // Aplicar filtros explícitos
    if (categoriaId) {
      filters.push(eq(recetas.categoriaId, Number.parseInt(categoriaId)))
    }

    if (dietaId) {
      filters.push(eq(recetas.dietaId, Number.parseInt(dietaId)))
    }

    if (dificultadOpciones.includes(dificultadParam as any)) {
      filters.push(eq(recetas.dificultad, dificultadParam as typeof dificultadOpciones[number]))
    }

    if (maxCalorias) {
      filters.push(sql`${recetas.caloriasPorPorcion} <= ${Number.parseInt(maxCalorias)}`)
    }

    // Personalización basada en el usuario (si está autenticado)
    if (usuarioDb) {
      // Si el usuario tiene un límite de calorías en sus metas y no se especificó un máximo explícito
      if (usuarioDb.metas?.[0]?.limiteCalorías && !maxCalorias) {
        const limiteCaloriasPorComida = Math.ceil(usuarioDb.metas[0].limiteCalorías / 3) // Aproximación simple
        filters.push(sql`${recetas.caloriasPorPorcion} <= ${limiteCaloriasPorComida}`)
      }

      // Si el usuario sigue dietas específicas y no se especificó una dieta explícita
      if (usuarioDb.dietas.length > 0 && !dietaId) {
        const dietasIds = usuarioDb.dietas.map((d) => d.dietaId)
        filters.push(sql`${recetas.dietaId} IN (${dietasIds.join(",")})`)
      }

      // Nota: Podrías añadir más personalización basada en preferencias, historial, etc.
    }

    const query = db
      .select({
        id: recetas.id,
        titulo: recetas.titulo,
        descripcion: recetas.descripcion,
        imagenUrl: recetas.imagenUrl,
        caloriasPorPorcion: recetas.caloriasPorPorcion,
        tiempoPreparacion: recetas.tiempoPreparacion,
        tiempoCoccion: recetas.tiempoCoccion,
        dificultad: recetas.dificultad,
        fechaCreacion: recetas.fechaCreacion,
        autorId: recetas.autorId,
        autorNombre: usuarios.nombre,
        autorFoto: usuarios.urlFotoPerfil,
        categoriaId: recetas.categoriaId,
        categoriaNombre: categorias.nombre,
        dietaId: recetas.dietaId,
        dietaNombre: dietas.nombre,
        puntuacionPromedio: sql`COALESCE(AVG(${puntuaciones.puntuacion}), 0)`,
        totalPuntuaciones: sql`COUNT(${puntuaciones.id})`,
      })
      .from(recetas)
      .leftJoin(usuarios, eq(recetas.autorId, usuarios.id))
      .leftJoin(categorias, eq(recetas.categoriaId, categorias.id))
      .leftJoin(dietas, eq(recetas.dietaId, dietas.id))
      .leftJoin(puntuaciones, eq(recetas.id, puntuaciones.recetaId))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .groupBy(recetas.id, usuarios.id, categorias.id, dietas.id)
      .orderBy(sql`RANDOM()`)
      .limit(cantidad)

    // Aplicar filtros
  
    const recetasAleatorias = await query

    return NextResponse.json({
      data: recetasAleatorias,
      personalizado: !!usuarioDb,
    })
  } catch (error) {
    console.error("Error al obtener recetas aleatorias:", error)
    return NextResponse.json({ error: "Error al obtener recetas aleatorias" }, { status: 500 })
  }
}
