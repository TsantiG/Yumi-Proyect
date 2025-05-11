import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { recetas, usuarios, categorias, dietas, recetasEtiquetas, dificultadEnum } from "../../db/schema"
import { and, eq, like, or, inArray, desc, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Parámetros de búsqueda
    const query = searchParams.get("q") || ""
    const categoriaId = searchParams.get("categoria")
    const dietaId = searchParams.get("dieta")
    const autorId = searchParams.get("autor")
    const etiquetasIds = searchParams.getAll("etiqueta")
    const minCalorias = searchParams.get("minCalorias")
    const maxCalorias = searchParams.get("maxCalorias")
    const dificultadParam = searchParams.get("dificultad")
    const ordenPor = searchParams.get("ordenar") || "relevancia"

    const filters = []

    // Búsqueda por texto en título o descripción
    if (query) {
      filters.push(
        or(
          like(recetas.titulo, `%${query}%`),
          like(recetas.descripcion, `%${query}%`),
          like(recetas.instrucciones, `%${query}%`),
        ),
      )
    }

    // Filtros básicos
    if (categoriaId) filters.push(eq(recetas.categoriaId, Number.parseInt(categoriaId)))
    if (dietaId) filters.push(eq(recetas.dietaId, Number.parseInt(dietaId)))
    if (autorId) filters.push(eq(recetas.autorId, autorId))

    // Filtros de calorías
    if (minCalorias) filters.push(sql`${recetas.caloriasPorPorcion} >= ${Number.parseInt(minCalorias)}`)
    if (maxCalorias) filters.push(sql`${recetas.caloriasPorPorcion} <= ${Number.parseInt(maxCalorias)}`)

    // Filtro de dificultad
    if (dificultadParam && dificultadEnum.enumValues.includes(dificultadParam as any)) {
      filters.push(eq(recetas.dificultad, dificultadParam as (typeof dificultadEnum.enumValues)[number]))
    }

    // Procesar filtro de etiquetas
    let recetasFiltradas: number[] | undefined = undefined

    if (etiquetasIds.length > 0) {
      const etiquetasIdsNum = etiquetasIds.map((id) => Number.parseInt(id))
      const recetasEtiquetasRows = await db
        .select({ recetaId: recetasEtiquetas.recetaId })
        .from(recetasEtiquetas)
        .where(inArray(recetasEtiquetas.etiquetaId, etiquetasIdsNum))

      recetasFiltradas = recetasEtiquetasRows.map((r) => r.recetaId).filter((id): id is number => id !== null)
    }

    // Combinar todos los filtros
    const whereConditions = [
      ...(filters.length > 0 ? [and(...filters)] : []),
      ...(recetasFiltradas?.length ? [inArray(recetas.id, recetasFiltradas)] : []),
    ]

    // Determinar el orden
    let orderByClause
    if (ordenPor === "fecha_desc") {
      orderByClause = desc(recetas.fechaCreacion)
    } else if (ordenPor === "calorias_desc") {
      orderByClause = desc(recetas.caloriasPorPorcion)
    } else if (ordenPor === "calorias_asc") {
      orderByClause = recetas.caloriasPorPorcion
    } else if (ordenPor === "tiempo_asc") {
      orderByClause = sql`(${recetas.tiempoPreparacion} + ${recetas.tiempoCoccion})`
    } else if (ordenPor === "relevancia" && query) {
      orderByClause = desc(
        sql`
          CASE 
            WHEN ${recetas.titulo} ILIKE ${`%${query}%`} THEN 3
            WHEN ${recetas.descripcion} ILIKE ${`%${query}%`} THEN 2
            WHEN ${recetas.instrucciones} ILIKE ${`%${query}%`} THEN 1
            ELSE 0
          END
        `,
      )
    } else {
      orderByClause = desc(recetas.fechaCreacion) // default
    }

    // Ejecutar la consulta completa
    const resultados = await db
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
      })
      .from(recetas)
      .leftJoin(usuarios, eq(recetas.autorId, usuarios.id))
      .leftJoin(categorias, eq(recetas.categoriaId, categorias.id))
      .leftJoin(dietas, eq(recetas.dietaId, dietas.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    // Contar total para paginación
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(recetas)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)

    return NextResponse.json({
      data: resultados,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error("Error en búsqueda avanzada:", error)
    return NextResponse.json({ error: "Error en búsqueda avanzada" }, { status: 500 })
  }
}
