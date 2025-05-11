import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { planComidas, planComidasDetalle, usuarios } from "../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener un plan de comidas específico con detalles
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Obtener plan
    const plan = await db.query.planComidas.findFirst({
      where: eq(planComidas.id, id),
    })

    if (!plan) {
      return NextResponse.json({ error: "Plan de comidas no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el propietario del plan
    if (plan.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para ver este plan" }, { status: 403 })
    }

    // Obtener detalles del plan
    const detalles = await db.query.planComidasDetalle.findMany({
      where: eq(planComidasDetalle.planId, id),
      with: {
        receta: true,
      },
      orderBy: (planComidasDetalle, { asc }) => [asc(planComidasDetalle.fecha)],
    })

    // Combinar datos
    const result = {
      ...plan,
      detalles,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error al obtener plan de comidas ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener plan de comidas" }, { status: 500 })
  }
}

// PUT: Actualizar un plan de comidas
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

    // Verificar si el plan existe
    const planExistente = await db.query.planComidas.findFirst({
      where: eq(planComidas.id, id),
    })

    if (!planExistente) {
      return NextResponse.json({ error: "Plan de comidas no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el propietario del plan
    if (planExistente.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar este plan" }, { status: 403 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Validar fechas si se proporcionan
    let fechaInicio = planExistente.fechaInicio
    let fechaFin = planExistente.fechaFin

    if (body.fechaInicio) {
      fechaInicio = new Date(body.fechaInicio)
    }

    if (body.fechaFin) {
      fechaFin = new Date(body.fechaFin)
    }

    // Validar que la fecha de fin sea posterior a la fecha de inicio
    if (fechaFin < fechaInicio) {
      return NextResponse.json({ error: "La fecha de fin debe ser posterior a la fecha de inicio" }, { status: 400 })
    }

    // Actualizar plan
    const planActualizado = await db
      .update(planComidas)
      .set({
        nombre: body.nombre !== undefined ? body.nombre : planExistente.nombre,
        fechaInicio,
        fechaFin,
      })
      .where(eq(planComidas.id, id))
      .returning()

    return NextResponse.json(planActualizado[0])
  } catch (error) {
    console.error(`Error al actualizar plan de comidas ${params.id}:`, error)
    return NextResponse.json({ error: "Error al actualizar plan de comidas" }, { status: 500 })
  }
}

// DELETE: Eliminar un plan de comidas
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

    // Verificar si el plan existe
    const planExistente = await db.query.planComidas.findFirst({
      where: eq(planComidas.id, id),
    })

    if (!planExistente) {
      return NextResponse.json({ error: "Plan de comidas no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el propietario del plan
    if (planExistente.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar este plan" }, { status: 403 })
    }

    // Eliminar detalles del plan
    await db.delete(planComidasDetalle).where(eq(planComidasDetalle.planId, id))

    // Eliminar plan
    await db.delete(planComidas).where(eq(planComidas.id, id))

    return NextResponse.json({ message: "Plan de comidas eliminado correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar plan de comidas ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar plan de comidas" }, { status: 500 })
  }
}

