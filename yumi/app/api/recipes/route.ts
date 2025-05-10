import { NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { recetas, usuarios } from "../db/schema"
import { desc, eq, like, and, or } from "drizzle-orm"
import { auth } from "@clerk/nextjs"

// GET: Obtener todas las recetas con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit
    
    // Filtros
    const titulo = searchParams.get("titulo")
    const categoriaId = searchParams.get("categoria")
    const dietaId = searchParams.get("dieta")
    const autorId = searchParams.get("autor")
    const ordenPor = searchParams.get("ordenar") || "fecha_desc" // fecha_desc, calorias_asc, etc.
    
    // Construir consulta base
    let query = db.select().from(recetas)
    
    // Aplicar filtros si existen
    if (titulo) {
      query = query.where(like(recetas.titulo, `%${titulo}%`))
    }
    
    if (categoriaId) {
      // Aquí necesitarías una relación entre recetas y categorías
      // Esta es una simplificación
      query = query.where(eq(recetas.categoriaId, parseInt(categoriaId)))
    }
    
    if (dietaId) {
      query = query.where(eq(recetas.dietaId, parseInt(dietaId)))
    }
    
    if (autorId) {
      query = query.where(eq(recetas.autorId, autorId))
    }
    
    // Aplicar ordenamiento
    if (ordenPor === "fecha_desc") {
      query = query.orderBy(desc(recetas.fechaCreacion))
    } else if (ordenPor === "calorias_asc") {
      query = query.orderBy(recetas.caloriasPorPorcion)
    }
    
    // Ejecutar consulta con paginación
    const resultados = await query.limit(limit).offset(offset)
    
    // Contar total para paginación
    const totalCount = await db.select({ count: sql`count(*)` }).from(recetas)
    const total = totalCount[0].count
    
    return NextResponse.json({
      data: resultados,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error al obtener recetas:", error)
    return NextResponse.json(
      { error: "Error al obtener recetas" },
      { status: 500 }
    )
  }
}

// POST: Crear una nueva receta
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }
    
    // Obtener usuario de la base de datos
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId)
    })
    
    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }
    
    // Obtener datos de la receta del cuerpo de la solicitud
    const body = await request.json()
    
    // Validar datos (simplificado, deberías usar Zod u otra biblioteca)
    if (!body.titulo || !body.instrucciones) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      )
    }
    
    // Crear la receta
    const nuevaReceta = await db.insert(recetas).values({
      autorId: usuario.id,
      titulo: body.titulo,
      descripcion: body.descripcion,
      instrucciones: body.instrucciones,
      tiempoPreparacion: body.tiempoPreparacion,
      tiempoCoccion: body.tiempoCoccion,
      porciones: body.porciones,
      dificultad: body.dificultad,
      caloriasPorPorcion: body.caloriasPorPorcion,
      imagenUrl: body.imagenUrl,
      dietaId: body.dietaId
    }).returning()
    
    return NextResponse.json(nuevaReceta[0], { status: 201 })
  } catch (error) {
    console.error("Error al crear receta:", error)
    return NextResponse.json(
      { error: "Error al crear receta" },
      { status: 500 }
    )
  }
}