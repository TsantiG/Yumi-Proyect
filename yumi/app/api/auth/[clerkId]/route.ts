import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { usuarios } from "../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener información de un usuario por su ID de Clerk
export async function GET(request: NextRequest, { params }: { params: { clerkId: string } }) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo permitir acceso al propio usuario o a administradores
    // Aquí deberías implementar una verificación de roles para administradores
    if (userId !== params.clerkId) {
      return NextResponse.json({ error: "No tienes permiso para acceder a estos datos" }, { status: 403 })
    }

    // Obtener usuario de la base de datos
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, params.clerkId),
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
        historialPeso: {
          orderBy: (historialPeso, { desc }) => [desc(historialPeso.fecha)],
          limit: 10,
        },
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(usuario)
  } catch (error) {
    console.error(`Error al obtener usuario con ID de Clerk ${params.clerkId}:`, error)
    return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 })
  }
}

// PATCH: Actualizar información de un usuario por su ID de Clerk
export async function PATCH(request: NextRequest, { params }: { params: { clerkId: string } }) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo permitir actualizar el propio usuario o a administradores
    if (userId !== params.clerkId) {
      return NextResponse.json({ error: "No tienes permiso para modificar estos datos" }, { status: 403 })
    }

    // Verificar que el usuario existe
    const usuarioExistente = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, params.clerkId),
    })

    if (!usuarioExistente) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Actualizar usuario
    const usuarioActualizado = await db
      .update(usuarios)
      .set({
        nombre: body.nombre !== undefined ? body.nombre : usuarioExistente.nombre,
        darkMode: body.darkMode !== undefined ? body.darkMode : usuarioExistente.darkMode,
        colorId: body.colorId !== undefined ? body.colorId : usuarioExistente.colorId,
        ultimaActualizacion: new Date(),
      })
      .where(eq(usuarios.idClerk, params.clerkId))
      .returning()

    return NextResponse.json(usuarioActualizado[0])
  } catch (error) {
    console.error(`Error al actualizar usuario con ID de Clerk ${params.clerkId}:`, error)
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 })
  }
}
