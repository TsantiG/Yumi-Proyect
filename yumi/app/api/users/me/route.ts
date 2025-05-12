// informacion de usuario actual, por hacer pero dejo la estructura para que no se me  olvideimport { type NextRequest, NextResponse } from "next/server"
import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { usuarios } from "../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener información del usuario actual
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener usuario de la base de datos
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
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
        color: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(usuario)
  } catch (error) {
    console.error("Error al obtener usuario actual:", error)
    return NextResponse.json({ error: "Error al obtener usuario" }, { status: 500 })
  }
}

// PATCH: Actualizar información del usuario actual
export async function PATCH(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que el usuario existe
    const usuarioExistente = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, userId),
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
      .where(eq(usuarios.idClerk, userId))
      .returning()

    return NextResponse.json(usuarioActualizado[0])
  } catch (error) {
    console.error("Error al actualizar usuario actual:", error)
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 })
  }
}
