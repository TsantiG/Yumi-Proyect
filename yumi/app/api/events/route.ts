import { type NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { eventos, usuarios } from "../db/schema"
import { eq, and, gte, lte, like, desc, sql } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener todos los eventos con filtros y paginación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const titulo = searchParams.get("titulo")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")
    const esVirtual = searchParams.get("esVirtual")
    const creadorId = searchParams.get("creador")
    const soloFuturos = searchParams.get("soloFuturos") === "true"

    const filters = []

    if (titulo) filters.push(like(eventos.titulo, `%${titulo}%`))
    if (desde) filters.push(gte(eventos.fechaInicio, new Date(desde)))
    if (hasta) filters.push(lte(eventos.fechaInicio, new Date(hasta)))
    if (esVirtual !== null) filters.push(eq(eventos.esVirtual, esVirtual === "true"))
    if (creadorId) filters.push(eq(eventos.creadorId, creadorId))
    if (soloFuturos) filters.push(gte(eventos.fechaInicio, new Date()))

    const whereClause = filters.length > 0 ? and(...filters) : undefined

    const resultados = await db
      .select({
        id: eventos.id,
        titulo: eventos.titulo,
        descripcion: eventos.descripcion,
        fechaInicio: eventos.fechaInicio,
        fechaFin: eventos.fechaFin,
        ubicacion: eventos.ubicacion,
        esVirtual: eventos.esVirtual,
        enlaceVirtual: eventos.enlaceVirtual,
        imagenUrl: eventos.imagenUrl,
        capacidadMaxima: eventos.capacidadMaxima,
        fechaCreacion: eventos.fechaCreacion,
        creadorId: eventos.creadorId,
        creadorNombre: usuarios.nombre,
        creadorFoto: usuarios.urlFotoPerfil,
      })
      .from(eventos)
      .leftJoin(usuarios, eq(eventos.creadorId, usuarios.id))
      .where(whereClause)
      .orderBy(eventos.fechaInicio)
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(eventos)
      .where(whereClause)

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
    console.error("Error al obtener eventos:", error)
    return NextResponse.json({ error: "Error al obtener eventos" }, { status: 500 })
  }
}

// POST: Crear evento (solo admins)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId ?? ""),
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (!usuario.esAdmin) {
      return NextResponse.json({ error: "Solo administradores pueden crear eventos" }, { status: 403 })
    }

    const body = await request.json()

    if (!body.titulo || !body.fechaInicio) {
      return NextResponse.json({ error: "Título y fecha de inicio son obligatorios" }, { status: 400 })
    }

    const fechaInicio = new Date(body.fechaInicio)
    if (fechaInicio < new Date()) {
      return NextResponse.json({ error: "La fecha de inicio debe ser futura" }, { status: 400 })
    }

    let fechaFin = null
    if (body.fechaFin) {
      fechaFin = new Date(body.fechaFin)
      if (fechaFin < fechaInicio) {
        return NextResponse.json({ error: "La fecha de fin debe ser posterior a la de inicio" }, { status: 400 })
      }
    }

    const nuevoEvento = await db
      .insert(eventos)
      .values({
        creadorId: usuario.id,
        titulo: body.titulo,
        descripcion: body.descripcion,
        fechaInicio,
        fechaFin,
        ubicacion: body.ubicacion,
        esVirtual: body.esVirtual || false,
        enlaceVirtual: body.enlaceVirtual,
        imagenUrl: body.imagenUrl,
        capacidadMaxima: body.capacidadMaxima,
        fechaCreacion: new Date(),
      })
      .returning()

    return NextResponse.json(nuevoEvento[0], { status: 201 })
  } catch (error) {
    console.error("Error al crear evento:", error)
    return NextResponse.json({ error: "Error al crear evento" }, { status: 500 })
  }
}
