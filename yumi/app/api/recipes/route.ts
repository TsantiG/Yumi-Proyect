import { NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { recetas, usuarios } from "../db/schema"
import { and, eq, like, desc, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";


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
    
    const filters = [];
    
    // Aplicar filtros si existen
    if (titulo) {
      filters.push(like(recetas.titulo, `%${titulo}%`))
    }
     
    if (categoriaId) {
      // Aquí necesitarías una relación entre recetas y categorías
      // Esta es una simplificación
      filters.push(eq(recetas.categoriaId, parseInt(categoriaId)))
    }
    
    if (dietaId) {
      filters.push(eq(recetas.dietaId, parseInt(dietaId)))
    }
    
    if (autorId) {
      filters.push(eq(recetas.autorId, autorId))
    }
    
    const query = db
      .select()
      .from(recetas)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(ordenPor === "fecha_desc" ? desc(recetas.fechaCreacion) : recetas.caloriasPorPorcion)
      .limit(limit)
      .offset(offset);
    
    // Ejecutar query
    const resultados = await query;
    return NextResponse.json({ data: resultados });
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
    const { userId } = await auth()
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