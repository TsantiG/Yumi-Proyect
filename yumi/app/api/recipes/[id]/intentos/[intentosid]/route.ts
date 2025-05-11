import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../../db"
import { recetas, intentosRecetas, usuarios } from "../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener un intento específico
export async function GET(request: NextRequest, { params }: { params: { id: string; intentoId: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const intentoId = Number.parseInt(params.intentoId)

    // Verificar que el intento existe y pertenece a la receta
    const intento = await db.query.intentosRecetas.findFirst({
      where: and(eq(intentosRecetas.id, intentoId), eq(intentosRecetas.recetaId, recetaId)),
      with: {
        usuario: true,
      },
    })

    if (!intento) {
      return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 })
    }

    return NextResponse.json(intento)
  } catch (error) {
    console.error(`Error al obtener intento ${params.intentoId}:`, error)
    return NextResponse.json({ error: "Error al obtener intento" }, { status: 500 })
  }
}

// PATCH: Actualizar un intento específico
export async function PATCH(request: NextRequest, { params }: { params: { id: string; intentoId: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const intentoId = Number.parseInt(params.intentoId)

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

    // Verificar que el intento existe y pertenece a la receta
    const intentoActual = await db.query.intentosRecetas.findFirst({
      where: and(eq(intentosRecetas.id, intentoId), eq(intentosRecetas.recetaId, recetaId)),
    })

    if (!intentoActual) {
      return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el autor del intento
    if (intentoActual.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar este intento" }, { status: 403 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Actualizar intento
    const intentoActualizado = await db
      .update(intentosRecetas)
      .set({
        imagenUrl: body.imagenUrl || intentoActual.imagenUrl,
        comentario: body.comentario !== undefined ? body.comentario : intentoActual.comentario,
        fecha: new Date(), // Actualizar fecha al editar
      })
      .where(eq(intentosRecetas.id, intentoId))
      .returning()

    // Obtener intento actualizado con información del usuario
    const intentoConUsuario = await db.query.intentosRecetas.findFirst({
      where: eq(intentosRecetas.id, intentoId),
      with: {
        usuario: true,
      },
    })

    return NextResponse.json(intentoConUsuario)
  } catch (error) {
    console.error(`Error al actualizar intento ${params.intentoId}:`, error)
    return NextResponse.json({ error: "Error al actualizar intento" }, { status: 500 })
  }
}

// DELETE: Eliminar un intento específico
export async function DELETE(request: NextRequest, { params }: { params: { id: string; intentoId: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const intentoId = Number.parseInt(params.intentoId)

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

    // Verificar que el intento existe y pertenece a la receta
    const intento = await db.query.intentosRecetas.findFirst({
      where: and(eq(intentosRecetas.id, intentoId), eq(intentosRecetas.recetaId, recetaId)),
    })

    if (!intento) {
      return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el autor del intento o el autor de la receta
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, recetaId),
    })

    if (intento.usuarioId !== usuario.id && receta?.autorId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar este intento" }, { status: 403 })
    }

    // Eliminar intento
    await db.delete(intentosRecetas).where(eq(intentosRecetas.id, intentoId))

    return NextResponse.json({ message: "Intento eliminado correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar intento ${params.intentoId}:`, error)
    return NextResponse.json({ error: "Error al eliminar intento" }, { status: 500 })
  }
}
