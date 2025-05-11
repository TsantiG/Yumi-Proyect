import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { planComidas, planComidasDetalle, recetas, usuarios, tipoComidaEnum } from "../../../db/schema"
import { eq, and, between } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener detalles de un plan de comidas
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const planId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)

    // Filtros
    const desde = searchParams.get("desde") // Fecha en formato ISO
    const hasta = searchParams.get("hasta") // Fecha en formato ISO
    const tipoComida = searchParams.get("tipoComida")

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
    const plan = await db.query.planComidas.findFirst({
      where: eq(planComidas.id, planId),
    })

    if (!plan) {
      return NextResponse.json({ error: "Plan de comidas no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el propietario del plan
    if (plan.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para ver este plan" }, { status: 403 })
    }

    // Construir filtros
    let filters = [eq(planComidasDetalle.planId, planId)]

    // Filtrar por rango de fechas
    if (desde && hasta) {
      filters.push(between(planComidasDetalle.fecha, new Date(desde), new Date(hasta)))
    } else if (desde) {
      filters.push(eq(planComidasDetalle.fecha, new Date(desde)))
    }

    // Filtrar por tipo de comida
    if (tipoComida && tipoComidaEnum.enumValues.includes(tipoComida as any)) {
      filters.push(eq(planComidasDetalle.tipoComida, tipoComida as (typeof tipoComidaEnum.enumValues)[number]))
    }

    // Obtener detalles del plan
    const detalles = await db.query.planComidasDetalle.findMany({
      where: and(...filters),
      with: {
        receta: true,
      },
      orderBy: (planComidasDetalle, { asc }) => [asc(planComidasDetalle.fecha)],
    })

    return NextResponse.json({
      plan: {
        id: plan.id,
        nombre: plan.nombre,
        fechaInicio: plan.fechaInicio,
        fechaFin: plan.fechaFin,
      },
      detalles,
    })
  } catch (error) {
    console.error(`Error al obtener detalles del plan de comidas ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener detalles del plan de comidas" }, { status: 500 })
  }
}

// POST: Añadir un detalle al plan de comidas
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const planId = Number.parseInt(params.id)

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
    const plan = await db.query.planComidas.findFirst({
      where: eq(planComidas.id, planId),
    })

    if (!plan) {
      return NextResponse.json({ error: "Plan de comidas no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el propietario del plan
    if (plan.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar este plan" }, { status: 403 })
    }

    // Obtener datos del detalle
    const body = await request.json()

    // Validar datos
    if (!body.fecha || !body.recetaId || !body.tipoComida) {
      return NextResponse.json({ error: "Fecha, recetaId y tipoComida son obligatorios" }, { status: 400 })
    }

    // Validar que la fecha está dentro del rango del plan
    const fecha = new Date(body.fecha)
    if (fecha < plan.fechaInicio || fecha > plan.fechaFin) {
      return NextResponse.json(
        { error: "La fecha debe estar dentro del rango del plan de comidas" },
        { status: 400 },
      )
    }

    // Validar que la receta existe
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, body.recetaId),
    })

    if (!receta) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    // Validar tipo de comida
    if (!tipoComidaEnum.enumValues.includes(body.tipoComida)) {
      return NextResponse.json({ error: "Tipo de comida no válido" }, { status: 400 })
    }

    // Verificar si ya existe un detalle para esta fecha y tipo de comida
    const detalleExistente = await db.query.planComidasDetalle.findFirst({
      where: and(
        eq(planComidasDetalle.planId, planId),
        eq(planComidasDetalle.fecha, fecha),
        eq(planComidasDetalle.tipoComida, body.tipoComida),
      ),
    })

    if (detalleExistente) {
      return NextResponse.json(
        { error: "Ya existe una comida para esta fecha y tipo de comida" },
        { status: 409 },
      )
    }

    // Crear detalle
    const nuevoDetalle = await db
      .insert(planComidasDetalle)
      .values({
        planId,
        recetaId: body.recetaId,
        fecha,
        tipoComida: body.tipoComida,
        porciones: body.porciones || 1,
      })
      .returning()

    // Obtener detalle con información de la receta
    const detalleConReceta = await db.query.planComidasDetalle.findFirst({
      where: eq(planComidasDetalle.id, nuevoDetalle[0].id),
      with: {
        receta: true,
      },
    })

    return NextResponse.json(detalleConReceta, { status: 201 })
  } catch (error) {
    console.error(`Error al añadir detalle al plan de comidas ${params.id}:`, error)
    return NextResponse.json({ error: "Error al añadir detalle al plan de comidas" }, { status: 500 })
  }
}

// DELETE: Eliminar un detalle del plan de comidas
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const planId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const detalleId = searchParams.get("detalleId")

    if (!detalleId) {
      return NextResponse.json({ error: "El parámetro detalleId es obligatorio" }, { status: 400 })
    }

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
    const plan = await db.query.planComidas.findFirst({
      where: eq(planComidas.id, planId),
    })

    if (!plan) {
      return NextResponse.json({ error: "Plan de comidas no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el propietario del plan
    if (plan.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar este plan" }, { status: 403 })
    }

    // Verificar si el detalle existe y pertenece al plan
    const detalle = await db.query.planComidasDetalle.findFirst({
      where: and(
        eq(planComidasDetalle.id, Number.parseInt(detalleId)),
        eq(planComidasDetalle.planId, planId),
      ),
    })

    if (!detalle) {
      return NextResponse.json({ error: "Detalle no encontrado" }, { status: 404 })
    }

    // Eliminar detalle
    await db.delete(planComidasDetalle).where(eq(planComidasDetalle.id, Number.parseInt(detalleId)))

    return NextResponse.json({ message: "Detalle eliminado correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar detalle del plan de comidas ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar detalle del plan de comidas" }, { status: 500 })
  }
}

