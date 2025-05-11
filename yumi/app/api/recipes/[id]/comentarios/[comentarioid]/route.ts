import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../../db"
import { recetas, comentarios, usuarios } from "../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener un comentario específico
export async function GET(request: NextRequest, { params }: { params: { id: string; comentarioId: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const comentarioId = Number.parseInt(params.comentarioId)

    // Verificar que el comentario existe y pertenece a la receta
    const comentario = await db.query.comentarios.findFirst({
      where: and(eq(comentarios.id, comentarioId), eq(comentarios.recetaId, recetaId)),
      with: {
        usuario: true,
      },
    })

    if (!comentario) {
      return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(comentario)
  } catch (error) {
    console.error(`Error al obtener comentario ${params.comentarioId}:`, error)
    return NextResponse.json({ error: "Error al obtener comentario" }, { status: 500 })
  }
}

// PATCH: Actualizar un comentario específico
export async function PATCH(request: NextRequest, { params }: { params: { id: string; comentarioId: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const comentarioId = Number.parseInt(params.comentarioId)

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

    // Verificar que el comentario existe y pertenece a la receta
    const comentarioActual = await db.query.comentarios.findFirst({
      where: and(eq(comentarios.id, comentarioId), eq(comentarios.recetaId, recetaId)),
    })

    if (!comentarioActual) {
      return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el autor del comentario
    if (comentarioActual.usuarioId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar este comentario" }, { status: 403 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Validar datos
    if (!body.contenido) {
      return NextResponse.json({ error: "El contenido del comentario es obligatorio" }, { status: 400 })
    }

    // Actualizar comentario
    const comentarioActualizado = await db
      .update(comentarios)
      .set({
        contenido: body.contenido,
        fecha: new Date(), // Actualizar fecha al editar
      })
      .where(eq(comentarios.id, comentarioId))
      .returning()

    // Obtener comentario actualizado con información del usuario
    const comentarioConUsuario = await db.query.comentarios.findFirst({
      where: eq(comentarios.id, comentarioId),
      with: {
        usuario: true,
      },
    })

    return NextResponse.json(comentarioConUsuario)
  } catch (error) {
    console.error(`Error al actualizar comentario ${params.comentarioId}:`, error)
    return NextResponse.json({ error: "Error al actualizar comentario" }, { status: 500 })
  }
}

// DELETE: Eliminar un comentario específico
export async function DELETE(request: NextRequest, { params }: { params: { id: string; comentarioId: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const comentarioId = Number.parseInt(params.comentarioId)

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

    // Verificar que el comentario existe y pertenece a la receta
    const comentario = await db.query.comentarios.findFirst({
      where: and(eq(comentarios.id, comentarioId), eq(comentarios.recetaId, recetaId)),
    })

    if (!comentario) {
      return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es el autor del comentario o el autor de la receta
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, recetaId),
    })

    if (comentario.usuarioId !== usuario.id && receta?.autorId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar este comentario" }, { status: 403 })
    }

    // Eliminar comentario
    await db.delete(comentarios).where(eq(comentarios.id, comentarioId))

    return NextResponse.json({ message: "Comentario eliminado correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar comentario ${params.comentarioId}:`, error)
    return NextResponse.json({ error: "Error al eliminar comentario" }, { status: 500 })
  }
}
