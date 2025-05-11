// infomrcaion de metas, tambiuen se debe cambiar el nombre de la carpeta
import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { usuarios, metasUsuario } from "../../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener metas de un usuario
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

    // Verificar que el usuario solicitado existe
    const usuarioSolicitado = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, params.id),
    })

    if (!usuarioSolicitado) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar permisos (solo el propio usuario o un administrador puede ver las metas)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para ver estas metas" }, { status: 403 })
    }

    // Obtener metas del usuario
    const metas = await db.query.metasUsuario.findMany({
      where: eq(metasUsuario.usuarioId, params.id),
      orderBy: (metasUsuario, { desc }) => [desc(metasUsuario.fechaActualizacion)],
    })

    return NextResponse.json(metas)
  } catch (error) {
    console.error(`Error al obtener metas del usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener metas" }, { status: 500 })
  }
}

// POST: Crear o actualizar metas de un usuario
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Verificar que el usuario solicitado existe
    const usuarioSolicitado = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, params.id),
    })

    if (!usuarioSolicitado) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar permisos (solo el propio usuario o un administrador puede actualizar las metas)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para modificar estas metas" }, { status: 403 })
    }

    // Obtener datos de las metas
    const body = await request.json()

    // Verificar si ya existen metas para este usuario
    const metasExistentes = await db.query.metasUsuario.findFirst({
      where: eq(metasUsuario.usuarioId, params.id),
    })

    let resultado

    if (metasExistentes) {
      // Actualizar metas existentes
      resultado = await db
        .update(metasUsuario)
        .set({
          altura: body.altura !== undefined ? body.altura : metasExistentes.altura,
          peso: body.peso !== undefined ? body.peso : metasExistentes.peso,
          actividadDiaria: body.actividadDiaria || metasExistentes.actividadDiaria,
          limiteCalorías: body.limiteCalorías !== undefined ? body.limiteCalorías : metasExistentes.limiteCalorías,
          proposito: body.proposito || metasExistentes.proposito,
          fechaActualizacion: new Date(),
        })
        .where(eq(metasUsuario.id, metasExistentes.id))
        .returning()
    } else {
      // Crear nuevas metas
      resultado = await db
        .insert(metasUsuario)
        .values({
          usuarioId: params.id,
          altura: body.altura,
          peso: body.peso,
          actividadDiaria: body.actividadDiaria,
          limiteCalorías: body.limiteCalorías,
          proposito: body.proposito,
          fechaInicio: new Date(),
          fechaActualizacion: new Date(),
        })
        .returning()
    }

    return NextResponse.json(resultado[0], { status: metasExistentes ? 200 : 201 })
  } catch (error) {
    console.error(`Error al actualizar metas del usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al actualizar metas" }, { status: 500 })
  }
}

// DELETE: Eliminar metas de un usuario
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Verificar que el usuario solicitado existe
    const usuarioSolicitado = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, params.id),
    })

    if (!usuarioSolicitado) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar permisos (solo el propio usuario o un administrador puede eliminar las metas)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para eliminar estas metas" }, { status: 403 })
    }

    // Verificar si existen metas para este usuario
    const metasExistentes = await db.query.metasUsuario.findFirst({
      where: eq(metasUsuario.usuarioId, params.id),
    })

    if (!metasExistentes) {
      return NextResponse.json({ error: "No se encontraron metas para este usuario" }, { status: 404 })
    }

    // Eliminar metas
    await db.delete(metasUsuario).where(eq(metasUsuario.id, metasExistentes.id))

    return NextResponse.json({ message: "Metas eliminadas correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar metas del usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar metas" }, { status: 500 })
  }
}
