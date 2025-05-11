import { type NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { planComidas, usuarios } from "../db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener planes de comidas del usuario actual
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Filtros
    const desde = searchParams.get("desde") // Fecha en formato ISO
    const hasta = searchParams.get("hasta") // Fecha en formato ISO
    const activos = searchParams.get("activos") === "true"

    const filters = [eq(planComidas.usuarioId, usuario.id)]

    // Aplicar filtros si existen
    if (desde) {
      filters.push(gte(planComidas.fechaInicio, new Date(desde)))
    }

    if (hasta) {
      filters.push(lte(planComidas.fechaFin, new Date(hasta)))
    }

    // Filtrar solo planes activos
    if (activos) {
      const hoy = new Date()
      filters.push(lte(planComidas.fechaInicio, hoy))
      filters.push(gte(planComidas.fechaFin, hoy))
    }

    // Construir la consulta
    let query = db
      .select()
      .from(planComidas)
      .where(and(...filters))
      .orderBy(planComidas.fechaInicio)
      .limit(limit)
      .offset(offset)

    // Ejecutar query
    const resultados = await query

    // Contar total para paginación
    const countQuery = db.select({ count: sql`count(*)` }).from(planComidas).where(and(...filters))
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
    console.error("Error al obtener planes de comidas:", error)
    return NextResponse.json({ error: "Error al obtener planes de comidas" }, { status: 500 })
  }
}

// POST: Crear un nuevo plan de comidas
export async function POST(request: NextRequest) {
  try {
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

    // Obtener datos del plan
    const body = await request.json()

    // Validar datos
    if (!body.fechaInicio || !body.fechaFin) {
      return NextResponse.json({ error: "Fecha de inicio y fin son obligatorias" }, { status: 400 })
    }

    const fechaInicio = new Date(body.fechaInicio)
    const fechaFin = new Date(body.fechaFin)

    // Validar que la fecha de fin sea posterior a la fecha de inicio
    if (fechaFin < fechaInicio) {
      return NextResponse.json({ error: "La fecha de fin debe ser posterior a la fecha de inicio" }, { status: 400 })
    }

    // Crear el plan
    const nuevoPlan = await db
      .insert(planComidas)
      .values({
        usuarioId: usuario.id,
        nombre: body.nombre || `Plan del ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}`,
        fechaInicio,
        fechaFin,
        fechaCreacion: new Date(),
      })
      .returning()

    return NextResponse.json(nuevoPlan[0], { status: 201 })
  } catch (error) {
    console.error("Error al crear plan de comidas:", error)
    return NextResponse.json({ error: "Error al crear plan de comidas" }, { status: 500 })
  }
}

