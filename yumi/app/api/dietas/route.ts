import { type NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { dietas } from "../db/schema"
import { eq, like } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener todas las dietas con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    // Filtros
    const nombre = searchParams.get("nombre")

    let query = db.select().from(dietas)

    // Aplicar filtro por nombre si existe
    if (nombre) {
      query = query.where(like(dietas.nombre, `%${nombre}%`))
    }

    // Aplicar paginación
    query = query.limit(limit).offset(offset)

    // Ejecutar query
    const resultados = await query

    // Contar total para paginación
    const countQuery = db.select({ count: sql`count(*)` }).from(dietas)
    if (nombre) {
      countQuery.where(like(dietas.nombre, `%${nombre}%`))
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
    console.error("Error al obtener dietas:", error)
    return NextResponse.json({ error: "Error al obtener dietas" }, { status: 500 })
  }
}

// POST: Crear una nueva dieta (solo para administradores)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías verificar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado crear dietas

    // Obtener datos de la dieta del cuerpo de la solicitud
    const body = await request.json()

    // Validar datos
    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre de la dieta es obligatorio" }, { status: 400 })
    }

    // Verificar si ya existe una dieta con ese nombre
    const dietaExistente = await db.query.dietas.findFirst({
      where: eq(dietas.nombre, body.nombre),
    })

    if (dietaExistente) {
      return NextResponse.json({ error: "Ya existe una dieta con ese nombre" }, { status: 409 })
    }

    // Crear la dieta
    const nuevaDieta = await db
      .insert(dietas)
      .values({
        nombre: body.nombre,
        descripcion: body.descripcion || null,
        restricciones: body.restricciones || null,
      })
      .returning()

    return NextResponse.json(nuevaDieta[0], { status: 201 })
  } catch (error) {
    console.error("Error al crear dieta:", error)
    return NextResponse.json({ error: "Error al crear dieta" }, { status: 500 })
  }
}

