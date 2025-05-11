import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { eventos, usuarios, eventosUsuarios } from "../../db/schema"
import { eq, count } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener un evento específico con detalles
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Obtener evento con información del creador
    const evento = await db.query.eventos.findFirst({
      where: eq(eventos.id, id),
      with: {
        creador: true,
      },
    })

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    // Contar participantes
    const participantesCount = await db
      .select({ count: count() })
      .from(eventosUsuarios)
      .where(eq(eventosUsuarios.eventoId, id))

    // Verificar si el usuario autenticado está participando
    let estaParticipando = false
    let estadoParticipacion = null

    const { userId } = await auth()
    if (userId) {
      const usuario = await db.query.usuarios.findFirst({
        where: eq(usuarios.idClerk, userId),
      })

      if (usuario) {
        const participacion = await db.query.eventosUsuarios.findFirst({
          where: eq(eventosUsuarios.eventoId, id),
        })

        if (participacion) {
          estaParticipando = true
          estadoParticipacion = participacion.estado
        }
      }
    }

    // Combinar datos
    const result = {
      ...evento,
      participantesCount: participantesCount[0].count,
      estaParticipando,
      estadoParticipacion,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error al obtener evento ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener evento" }, { status: 500 })
  }
}

// PUT: Actualizar un evento
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

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
    const eventoExistente = await db.query.eventos.findFirst({
      where: eq(eventos.id, id),
    })

    if (!eventoExistente) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el creador del evento
    if (eventoExistente.creadorId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar este evento" }, { status: 403 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Validar datos
    if (!body.titulo || !body.fechaInicio) {
      return NextResponse.json({ error: "Título y fecha de inicio son obligatorios" }, { status: 400 })
    }

    // Validar fechas
    const fechaInicio = new Date(body.fechaInicio)
    let fechaFin = null
    if (body.fechaFin) {
      fechaFin = new Date(body.fechaFin)
      if (fechaFin < fechaInicio) {
        return NextResponse.json({ error: "La fecha de fin debe ser posterior a la fecha de inicio" }, { status: 400 })
      }
    }

    // Actualizar evento
    const eventoActualizado = await db
      .update(eventos)
      .set({
        titulo: body.titulo,
        descripcion: body.descripcion !== undefined ? body.descripcion : eventoExistente.descripcion,
        fechaInicio,
        fechaFin,
        ubicacion: body.ubicacion !== undefined ? body.ubicacion : eventoExistente.ubicacion,
        esVirtual: body.esVirtual !== undefined ? body.esVirtual : eventoExistente.esVirtual,
        enlaceVirtual: body.enlaceVirtual !== undefined ? body.enlaceVirtual : eventoExistente.enlaceVirtual,
        imagenUrl: body.imagenUrl !== undefined ? body.imagenUrl : eventoExistente.imagenUrl,
        capacidadMaxima:
          body.capacidadMaxima !== undefined ? body.capacidadMaxima : eventoExistente.capacidadMaxima,
      })
      .where(eq(eventos.id, id))
      .returning()

    return NextResponse.json(eventoActualizado[0])
  } catch (error) {
    console.error(`Error al actualizar evento ${params.id}:`, error)
    return NextResponse.json({ error: "Error al actualizar evento" }, { status: 500 })
  }
}

// DELETE: Eliminar un evento
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

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
    const eventoExistente = await db.query.eventos.findFirst({
      where: eq(eventos.id, id),
    })

    if (!eventoExistente) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el creador del evento
    if (eventoExistente.creadorId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar este evento" }, { status: 403 })
    }

    // Eliminar participaciones en el evento
    await db.delete(eventosUsuarios).where(eq(eventosUsuarios.eventoId, id))

    // Eliminar evento
    await db.delete(eventos).where(eq(eventos.id, id))

    return NextResponse.json({ message: "Evento eliminado correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar evento ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar evento" }, { status: 500 })
  }
}

