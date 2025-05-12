import { type NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { dietas, usuarios } from "../db/schema"
import { eq, like, sql } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener todas las dietas con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit
    const nombre = searchParams.get("nombre")

    const filters = nombre ? [like(dietas.nombre, `%${nombre}%`)] : []

    const dietasResult = await db
      .select()
      .from(dietas)
      .where(filters.length ? filters[0] : undefined)
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(dietas)
      .where(filters.length ? filters[0] : undefined)

    return NextResponse.json({
      data: dietasResult,
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
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId ?? ""),
    })

    if (!user || !user.esAdmin) {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 })
    }

    const body = await request.json()

    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre de la dieta es obligatorio" }, { status: 400 })
    }

    const existe = await db.query.dietas.findFirst({
      where: eq(dietas.nombre, body.nombre),
    })

    if (existe) {
      return NextResponse.json({ error: "Ya existe una dieta con ese nombre" }, { status: 409 })
    }

    const nueva = await db
      .insert(dietas)
      .values({
        nombre: body.nombre,
        descripcion: body.descripcion || null,
        restricciones: body.restricciones || null,
      })
      .returning()

    return NextResponse.json(nueva[0], { status: 201 })
  } catch (error) {
    console.error("Error al crear dieta:", error)
    return NextResponse.json({ error: "Error al crear dieta" }, { status: 500 })
  }
}
