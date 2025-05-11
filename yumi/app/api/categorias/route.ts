import { type NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { categorias } from "../db/schema"
import { eq, like } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener todas las categorías con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    // Filtros
    const nombre = searchParams.get("nombre")

    let query = db.select().from(categorias)

    // Aplicar filtro por nombre si existe
    if (nombre) {
      query = query.where(like(categorias.nombre, `%${nombre}%`))
    }

    // Aplicar paginación
    query = query.limit(limit).offset(offset)

    // Ejecutar query
    const resultados = await query

    // Contar total para paginación
    const countQuery = db.select({ count: sql`count(*)` }).from(categorias)
    if (nombre) {
      countQuery.where(like(categorias.nombre, `%${nombre}%`))
    }
    const [{ count }] = await countQuery

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
    console.error("Error al obtener categorías:", error)
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 })
  }
}

// POST: Crear una nueva categoría (solo para administradores)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías verificar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado crear categorías

    // Obtener datos de la categoría del cuerpo de la solicitud
    const body = await request.json()

    // Validar datos
    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre de la categoría es obligatorio" }, { status: 400 })
    }

    // Verificar si ya existe una categoría con ese nombre
    const categoriaExistente = await db.query.categorias.findFirst({
      where: eq(categorias.nombre, body.nombre),
    })

    if (categoriaExistente) {
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 })
    }

    // Crear la categoría
    const nuevaCategoria = await db
      .insert(categorias)
      .values({
        nombre: body.nombre,
        descripcion: body.descripcion || null,
      })
      .returning()

    return NextResponse.json(nuevaCategoria[0], { status: 201 })
  } catch (error) {
    console.error("Error al crear categoría:", error)
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 })
  }
}

