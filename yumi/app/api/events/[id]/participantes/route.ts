import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { eventos, eventosUsuarios, usuarios, estadoEventoEnum } from "../../../db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener participantes de un evento
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventoId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    // Filtro por estado
    const estado = searchParams.get("estado")

    // Verificar si el evento existe
    const evento = await db.query.eventos.findFirst({
      where: eq(eventos.id, eventoId),
    })

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    // Construir la consulta
    let query = db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        urlFotoPerfil: usuarios.urlFotoPerfil,
        estado: eventosUsuarios.estado,
        fechaRegistro: eventosUsuarios.fechaRegistro,
      })
      .from(eventosUsuarios)
      .innerJoin(usuarios, eq(eventosUsuarios.usuarioId, usuarios.id))
      .where(eq(eventosUsuarios.eventoId, eventoId))

    // Aplicar filtro por estado si existe
    if (estado && estadoEventoEnum.enumValues.includes(estado as any)) {
      query = query.where(eq(eventosUsuarios.estado, estado as (typeof estadoEventoEnum.enumValues)[number]))
    }

    // Aplicar paginación
    query = query.limit(limit).offset(offset)

    // Ejecutar query
    const participantes = await query

    // Contar total para paginación
    let countQuery = db
      .select({ count: sql`count(*)` })
      .from(eventosUsuarios)
      .where(eq(eventosUsuarios.eventoId, eventoId))

    // Aplicar filtro por estado al conteo si existe
    if (estado && estadoEventoEnum.enumValues.includes(estado as any)) {
      countQuery = countQuery.where(
        eq(eventosUsuarios.estado, estado as (typeof estadoEventoEnum.enumValues)[number]),
      )
    }

    const [{ count }] = await countQuery

    return NextResponse.json({
      evento: {
        id: evento.id,
        titulo: evento.titulo,
        fechaInicio: evento.fechaInicio,
      },
      participantes,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error(`Error al obtener participantes del evento ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener participantes" }, { status: 500 })
  }
}

// POST: Registrar participación en un evento
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventoId = Number.parseInt(params.id)

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

    // Verificar si el evento existe
    const evento = await db.query.eventos.findFirst({
      where: eq(eventos.id, eventoId),
    })

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    // Verificar si el evento ya pasó
    if (evento.fechaInicio < new Date()) {
      return NextResponse.json({ error: "No puedes registrarte a un evento que ya pasó" }, { status: 400 })
    }

    // Verificar si el usuario ya está registrado
    const participacionExistente = await db.query.eventosUsuarios.findFirst({
      where: and(eq(eventosUsuarios.eventoId, eventoId), eq(eventosUsuarios.usuarioId, usuario.id)),
    })

    if (participacionExistente) {
      return NextResponse.json({ error: "Ya estás registrado en este evento" }, { status: 409 })
    }

    // Verificar si hay capacidad disponible
    if (evento.capacidadMaxima) {
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(eventosUsuarios)
        .where(eq(eventosUsuarios.eventoId, eventoId))

      if (Number(count) >= evento.capacidadMaxima) {
        return NextResponse.json({ error: "El evento ha alcanzado su capacidad máxima" }, { status: 400 })
      }
    }

    // Obtener datos de la participación
    const body = await request.json()
    const estado = body.estado || "confirmado"

    // Validar estado
    if (!estadoEventoEnum.enumValues.includes(estado as any)) {
      return NextResponse.json({ error: "Estado de participación no válido" }, { status: 400 })
    }

    // Registrar participación
    const nuevaParticipacion = await db
      .insert(eventosUsuarios)
      .values({
        eventoId,
        usuarioId: usuario.id,
        estado: estado as (typeof estadoEventoEnum.enumValues)[number],
        fechaRegistro: new Date(),
      })
      .returning()

    return NextResponse.json(nuevaParticipacion[0], { status: 201 })
  } catch (error) {
    console.error(`Error al registrar participación en el evento ${params.id}:`, error)
    return NextResponse.json({ error: "Error al registrar participación" }, { status: 500 })
  }
}

// DELETE: Cancelar participación en un evento
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventoId = Number.parseInt(params.id)

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

    // Verificar si el evento existe
    const evento = await db.query.eventos.findFirst({
      where: eq(eventos.id, eventoId),
    })

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    // Verificar si el usuario está registrado
    const participacion = await db.query.eventosUsuarios.findFirst({
      where: and(eq(eventosUsuarios.eventoId, eventoId), eq(eventosUsuarios.usuarioId, usuario.id)),
    })

    if (!participacion) {
      return NextResponse.json({ error: "No estás registrado en este evento" }, { status: 404 })
    }

    // Eliminar participación
    await db
      .delete(eventosUsuarios)
      .where(and(eq(eventosUsuarios.eventoId, eventoId), eq(eventosUsuarios.usuarioId, usuario.id)))

    return NextResponse.json({ message: "Participación cancelada correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al cancelar participación en el evento ${params.id}:`, error)
    return NextResponse.json({ error: "Error al cancelar participación" }, { status: 500 })
  }
}

