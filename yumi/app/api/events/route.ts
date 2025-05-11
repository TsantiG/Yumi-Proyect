import { type NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { eventos, usuarios } from "../db/schema"
import { eq, and, gte, lte, like, desc } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener todos los eventos con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Filtros
    const titulo = searchParams.get("titulo")
    const desde = searchParams.get("desde") // Fecha en formato ISO
    const hasta = searchParams.get("hasta") // Fecha en formato ISO
    const esVirtual = searchParams.get("esVirtual") // "true" o "false"
    const creadorId = searchParams.get("creador")
    const soloFuturos = searchParams.get("soloFuturos") === "true"

    const filters = []

    // Aplicar filtros si existen
    if (titulo) {
      filters.push(like(eventos.titulo, `%${titulo}%`))
    }

    if (desde) {
      filters.push(gte(eventos.fechaInicio, new Date(desde)))
    }

    if (hasta) {
      filters.push(lte(eventos.fechaInicio, new Date(hasta)))
    }

    if (esVirtual !== null) {
      filters.push(eq(eventos.esVirtual, esVirtual === "true"))
    }

    if (creadorId) {
      filters.push(eq(eventos.creadorId, creadorId))
    }

    // Filtrar solo eventos futuros
    if (soloFuturos) {
      filters.push(gte(eventos.fechaInicio, new Date()))
    }

    // Construir la consulta base
    let query = db
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

    // Aplicar filtros
    if (filters.length > 0) {
      query = query.where(and(...filters))
    }

    // Ordenar por fecha de inicio (eventos más próximos primero)
    query = query.orderBy(eventos.fechaInicio)

    // Aplicar paginación
    query = query.limit(limit).offset(offset)

    // Ejecutar query
    const resultados = await query

    // Contar total para paginación
    const countQuery = db.select({ count: sql`count(*)` }).from(eventos)
    if (filters.length > 0) {
      countQuery.where(and(...filters))
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
    console.error("Error al obtener eventos:", error)
    return NextResponse.json({ error: "Error al obtener eventos" }, { status: 500 })
  }
}

// POST: Crear un nuevo evento
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener usuario de la base de datos
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener datos del evento del cuerpo de la solicitud
    const body = await request.json()

    // Validar datos
    if (!body.titulo || !body.fechaInicio) {
      return NextResponse.json({ error: "Título y fecha de inicio son obligatorios" }, { status: 400 })
    }

    // Validar que la fecha de inicio sea futura
    const fechaInicio = new Date(body.fechaInicio)
    if (fechaInicio < new Date()) {
      return NextResponse.json({ error: "La fecha de inicio debe ser futura" }, { status: 400 })
    }

    // Validar que la fecha de fin sea posterior a la fecha de inicio
    let fechaFin = null
    if (body.fechaFin) {
      fechaFin = new Date(body.fechaFin)
      if (fechaFin < fechaInicio) {
        return NextResponse.json({ error: "La fecha de fin debe ser posterior a la fecha de inicio" }, { status: 400 })
      }
    }

    // Crear el evento
    const nuevoEvento = await db
      .insert(eventos)
      .values({
        creadorId: usuario.id,
        titulo: body.titulo,
        descripcion: body.descripcion,
        fechaInicio,
        fechaFin: fechaFin,
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

