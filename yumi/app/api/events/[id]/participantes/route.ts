import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import {
  eventos,
  eventosUsuarios,
  usuarios,
  estadoEventoEnum,
} from "../../../db/schema"
import { and, eq, sql } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Participantes de un evento
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventoId = parseInt(params.id)
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit
    const estado = searchParams.get("estado")

    // Validar existencia del evento
    const evento = await db.query.eventos.findFirst({
      where: eq(eventos.id, eventoId),
    })

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    // Condiciones de filtrado
    const whereConditions = [eq(eventosUsuarios.eventoId, eventoId)]
    if (estado && estadoEventoEnum.enumValues.includes(estado as any)) {
      whereConditions.push(eq(eventosUsuarios.estado, estado as typeof estadoEventoEnum.enumValues[number]))
    }

    const participantes = await db
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
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(eventosUsuarios)
      .where(and(...whereConditions))

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
    console.error("Error en GET participantes:", error)
    return NextResponse.json({ error: "Error al obtener participantes" }, { status: 500 })
  }
}

// POST: Registrar participación
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventoId = parseInt(params.id)
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const evento = await db.query.eventos.findFirst({
      where: eq(eventos.id, eventoId),
    })

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    if (evento.fechaInicio < new Date()) {
      return NextResponse.json({ error: "El evento ya inició o finalizó" }, { status: 400 })
    }

    const yaRegistrado = await db.query.eventosUsuarios.findFirst({
      where: and(eq(eventosUsuarios.eventoId, eventoId), eq(eventosUsuarios.usuarioId, usuario.id)),
    })

    if (yaRegistrado) {
      return NextResponse.json({ error: "Ya estás registrado" }, { status: 409 })
    }

    if (evento.capacidadMaxima) {
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(eventosUsuarios)
        .where(eq(eventosUsuarios.eventoId, eventoId))

      if (Number(count) >= evento.capacidadMaxima) {
        return NextResponse.json({ error: "Evento lleno" }, { status: 400 })
      }
    }

    const body = await request.json()
    const estado = (body.estado || "confirmado") as typeof estadoEventoEnum.enumValues[number]

    if (!estadoEventoEnum.enumValues.includes(estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    const nuevaParticipacion = await db
      .insert(eventosUsuarios)
      .values({
        eventoId,
        usuarioId: usuario.id,
        estado,
        fechaRegistro: new Date(),
      })
      .returning()

    return NextResponse.json(nuevaParticipacion[0], { status: 201 })
  } catch (error) {
    console.error("Error en POST participación:", error)
    return NextResponse.json({ error: "Error al registrar participación" }, { status: 500 })
  }
}

// DELETE: Cancelar participación
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventoId = parseInt(params.id)
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const participacion = await db.query.eventosUsuarios.findFirst({
      where: and(eq(eventosUsuarios.eventoId, eventoId), eq(eventosUsuarios.usuarioId, usuario.id)),
    })

    if (!participacion) {
      return NextResponse.json({ error: "No estás registrado" }, { status: 404 })
    }

    await db
      .delete(eventosUsuarios)
      .where(and(eq(eventosUsuarios.eventoId, eventoId), eq(eventosUsuarios.usuarioId, usuario.id)))

    return NextResponse.json({ message: "Participación cancelada" }, { status: 200 })
  } catch (error) {
    console.error("Error en DELETE participación:", error)
    return NextResponse.json({ error: "Error al cancelar participación" }, { status: 500 })
  }
}
