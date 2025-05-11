import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { usuarios } from "../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener un usuario específico por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener usuario actual para verificar permisos
    const usuarioActual = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
    })

    if (!usuarioActual) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener usuario solicitado
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, params.id),
      with: {
        metas: true,
        preferencias: {
          with: {
            categoria: true,
          },
        },
        dietas: {
          with: {
            dieta: true,
          },
        },
        color: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Si no es el propio usuario, limitar la información que se devuelve
    // Aquí deberías implementar una verificación de roles para administradores
    if (usuarioActual.id !== usuario.id) {
      // Versión limitada para otros usuarios
      return NextResponse.json({
        id: usuario.id,
        nombre: usuario.nombre,
        urlFotoPerfil: usuario.urlFotoPerfil,
        // Añadir otros campos públicos según sea necesario
      })
    }

    // Versión completa para el propio usuario
    return NextResponse.json(usuario)
  } catch (error) {
    console.error(`Error al obtener usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 })
  }
}

// PUT: Actualizar un usuario específico
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener usuario actual para verificar permisos
    const usuarioActual = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
    })

    if (!usuarioActual) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario a actualizar existe
    const usuarioExistente = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, params.id),
    })

    if (!usuarioExistente) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar permisos (solo el propio usuario o un administrador puede actualizar)
    if (usuarioActual.id !== usuarioExistente.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para modificar este usuario" }, { status: 403 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Actualizar usuario
    const usuarioActualizado = await db
      .update(usuarios)
      .set({
        nombre: body.nombre !== undefined ? body.nombre : usuarioExistente.nombre,
        colorId: body.colorId !== undefined ? body.colorId : usuarioExistente.colorId,
        darkMode: body.darkMode !== undefined ? body.darkMode : usuarioExistente.darkMode,
        ultimaActualizacion: new Date(),
      })
      .where(eq(usuarios.id, params.id))
      .returning()

    return NextResponse.json(usuarioActualizado[0])
  } catch (error) {
    console.error(`Error al actualizar usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 })
  }
}

// DELETE: Eliminar un usuario específico (solo administradores)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías implementar una verificación de roles para administradores
    // Por ahora, solo permitimos que un usuario elimine su propia cuenta

    // Obtener usuario actual
    const usuarioActual = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
    })

    if (!usuarioActual) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario a eliminar existe
    const usuarioExistente = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, params.id),
    })

    if (!usuarioExistente) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar permisos (solo el propio usuario o un administrador puede eliminar)
    if (usuarioActual.id !== usuarioExistente.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para eliminar este usuario" }, { status: 403 })
    }

    // Eliminar usuario
    await db.delete(usuarios).where(eq(usuarios.id, params.id))

    return NextResponse.json({ message: "Usuario eliminado correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 })
  }
}
