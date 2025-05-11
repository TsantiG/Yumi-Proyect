import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { colecciones, recetasColeccion, recetas, usuarios } from "../../../db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener recetas de una colección
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const coleccionId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Obtener colección
    const coleccion = await db.query.colecciones.findFirst({
      where: eq(colecciones.id, coleccionId),
    })

    if (!coleccion) {
      return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 })
    }

    // Verificar permisos si la colección no es pública
    if (!coleccion.esPublica) {
      // Verificar autenticación
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
      }

      // Obtener usuario
      const usuario = await db.query.usuarios.findFirst({
        where: eq(usuarios.idClerk, userId),
      })

      if (!usuario || usuario.id !== coleccion.usuarioId) {
        return NextResponse.json({ error: "No tienes permiso para ver esta colección" }, { status: 403 })
      }
    }

    // Obtener recetas de la colección
    const recetasIds = await db
      .select({ recetaId: recetasColeccion.recetaId })
      .from(recetasColeccion)
      .where(eq(recetasColeccion.coleccionId, coleccionId))
      .limit(limit)
      .offset(offset)

    // Si no hay recetas, devolver array vacío
    if (recetasIds.length === 0) {
      return NextResponse.json({
        coleccion,
        recetas: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      })
    }

    // Obtener detalles de las recetas
    const recetasDetalle = await db.query.recetas.findMany({
      where: sql`${recetas.id} IN (${recetasIds.map((r) => r.recetaId).join(",")})`,
      with: {
        autor: true,
        categoria: true,
        dieta: true,
        puntuaciones: true,
      },
    })

    // Calcular puntuación promedio para cada receta
    const recetasConPuntuacion = recetasDetalle.map((receta) => {
      const puntuaciones = receta.puntuaciones || []
      const totalPuntuaciones = puntuaciones.length
      const sumaPuntuaciones = puntuaciones.reduce((sum, p) => sum + p.puntuacion, 0)
      const promedioPuntuacion = totalPuntuaciones > 0 ? sumaPuntuaciones / totalPuntuaciones : 0

      return {
        ...receta,
        puntuacionPromedio: promedioPuntuacion,
        totalPuntuaciones,
      }
    })

    // Contar total para paginación
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(recetasColeccion)
      .where(eq(recetasColeccion.coleccionId, coleccionId))

    return NextResponse.json({
      coleccion,
      recetas: recetasConPuntuacion,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error(`Error al obtener recetas de la colección ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener recetas de la colección" }, { status: 500 })
  }
}

// POST: Añadir una receta a la colección
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const coleccionId = Number.parseInt(params.id)

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

    // Verificar si la colección existe y pertenece al usuario
    const coleccion = await db.query.colecciones.findFirst({
      where: eq(colecciones.id, coleccionId),
    })

    if (!coleccion) {
      return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 })
    }

    if (coleccion.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar esta colección" }, { status: 403 })
    }

    // Obtener datos de la receta a añadir
    const body = await request.json()

    // Validar datos
    if (!body.recetaId) {
      return NextResponse.json({ error: "El ID de la receta es obligatorio" }, { status: 400 })
    }

    // Verificar que la receta existe
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, body.recetaId),
    })

    if (!receta) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    // Verificar si la receta ya está en la colección
    const recetaExistente = await db.query.recetasColeccion.findFirst({
      where: and(
        eq(recetasColeccion.coleccionId, coleccionId),
        eq(recetasColeccion.recetaId, body.recetaId),
      ),
    })

    if (recetaExistente) {
      return NextResponse.json({ error: "Esta receta ya está en la colección" }, { status: 409 })
    }

    // Añadir receta a la colección
    const nuevaRecetaColeccion = await db
      .insert(recetasColeccion)
      .values({
        coleccionId,
        recetaId: body.recetaId,
        fechaAgregado: new Date(),
      })
      .returning()

    return NextResponse.json(nuevaRecetaColeccion[0], { status: 201 })
  } catch (error) {
    console.error(`Error al añadir receta a la colección ${params.id}:`, error)
    return NextResponse.json({ error: "Error al añadir receta a la colección" }, { status: 500 })
  }
}

// DELETE: Eliminar una receta de la colección
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const coleccionId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const recetaId = searchParams.get("recetaId")

    if (!recetaId) {
      return NextResponse.json({ error: "El parámetro recetaId es obligatorio" }, { status: 400 })
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

    // Verificar si la colección existe y pertenece al usuario
    const coleccion = await db.query.colecciones.findFirst({
      where: eq(colecciones.id, coleccionId),
    })

    if (!coleccion) {
      return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 })
    }

    if (coleccion.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar esta colección" }, { status: 403 })
    }

    // Verificar si la receta está en la colección
    const recetaColeccion = await db.query.recetasColeccion.findFirst({
      where: and(
        eq(recetasColeccion.coleccionId, coleccionId),
        eq(recetasColeccion.recetaId, Number.parseInt(recetaId)),
      ),
    })

    if (!recetaColeccion) {
      return NextResponse.json({ error: "Esta receta no está en la colección" }, { status: 404 })
    }

    // Eliminar receta de la colección
    await db
      .delete(recetasColeccion)
      .where(
        and(
          eq(recetasColeccion.coleccionId, coleccionId),
          eq(recetasColeccion.recetaId, Number.parseInt(recetaId)),
        ),
      )

    return NextResponse.json({ message: "Receta eliminada de la colección correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar receta de la colección ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar receta de la colección" }, { status: 500 })
  }
}

