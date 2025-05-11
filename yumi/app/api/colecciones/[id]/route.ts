import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { colecciones, recetasColeccion, usuarios } from "../../db/schema"
import { eq, count } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener una colección específica con detalles
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Obtener colección
    const coleccion = await db.query.colecciones.findFirst({
      where: eq(colecciones.id, id),
      with: {
        usuario: true,
      },
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

    // Contar recetas en la colección
    const recetasCount = await db
      .select({ count: count() })
      .from(recetasColeccion)
      .where(eq(recetasColeccion.coleccionId, id))

    // Combinar datos
    const result = {
      ...coleccion,
      recetasCount: recetasCount[0].count,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error al obtener colección ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener colección" }, { status: 500 })
  }
}

// PUT: Actualizar una colección
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

    // Verificar si la colección existe
    const coleccionExistente = await db.query.colecciones.findFirst({
      where: eq(colecciones.id, id),
    })

    if (!coleccionExistente) {
      return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 })
    }

    // Verificar que el usuario es el propietario de la colección
    if (coleccionExistente.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar esta colección" }, { status: 403 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Validar datos
    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre de la colección es obligatorio" }, { status: 400 })
    }

    // Actualizar colección
    const coleccionActualizada = await db
      .update(colecciones)
      .set({
        nombre: body.nombre,
        descripcion: body.descripcion !== undefined ? body.descripcion : coleccionExistente.descripcion,
        esPublica: body.esPublica !== undefined ? body.esPublica : coleccionExistente.esPublica,
      })
      .where(eq(colecciones.id, id))
      .returning()

    return NextResponse.json(coleccionActualizada[0])
  } catch (error) {
    console.error(`Error al actualizar colección ${params.id}:`, error)
    return NextResponse.json({ error: "Error al actualizar colección" }, { status: 500 })
  }
}

// DELETE: Eliminar una colección
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

    // Verificar si la colección existe
    const coleccionExistente = await db.query.colecciones.findFirst({
      where: eq(colecciones.id, id),
    })

    if (!coleccionExistente) {
      return NextResponse.json({ error: "Colección no encontrada" }, { status: 404 })
    }

    // Verificar que el usuario es el propietario de la colección
    if (coleccionExistente.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar esta colección" }, { status: 403 })
    }

    // Eliminar recetas de la colección
    await db.delete(recetasColeccion).where(eq(recetasColeccion.coleccionId, id))

    // Eliminar colección
    await db.delete(colecciones).where(eq(colecciones.id, id))

    return NextResponse.json({ message: "Colección eliminada correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar colección ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar colección" }, { status: 500 })
  }
}

