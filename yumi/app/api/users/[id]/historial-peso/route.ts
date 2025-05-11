//se necesita cambiar el nombre de la carpeta, por hacer
import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { usuarios, historialPeso, metasUsuario } from "../../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener historial de peso de un usuario
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

    // Verificar permisos (solo el propio usuario o un administrador puede ver el historial)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para ver este historial" }, { status: 403 })
    }

    // Parámetros de paginación y filtros
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")

    // Construir la consulta
    const query = db.query.historialPeso.findMany({
      where: eq(historialPeso.usuarioId, params.id),
      orderBy: (historialPeso, { desc }) => [desc(historialPeso.fecha)],
      limit,
    })

    // Ejecutar la consulta
    const registros = await query

    // Calcular estadísticas
    let pesoInicial = null
    let pesoActual = null
    let cambio = null
    let tendencia = null

    if (registros.length > 0) {
      // El peso más antiguo (último en la lista ordenada por fecha descendente)
      pesoInicial = registros[registros.length - 1].peso

      // El peso más reciente (primero en la lista)
      pesoActual = registros[0].peso

      // Calcular cambio
      cambio = Number(pesoActual) - Number(pesoInicial)

      // Calcular tendencia (promedio de cambio por día)
      if (registros.length > 1) {
        const diasTranscurridos =
          (new Date(registros[0].fecha).getTime() - new Date(registros[registros.length - 1].fecha).getTime()) /
          (1000 * 60 * 60 * 24)
        tendencia = diasTranscurridos > 0 ? cambio / diasTranscurridos : 0
      }
    }

    return NextResponse.json({
      registros,
      estadisticas: {
        pesoInicial,
        pesoActual,
        cambio,
        tendencia,
        totalRegistros: registros.length,
      },
    })
  } catch (error) {
    console.error(`Error al obtener historial de peso del usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener historial de peso" }, { status: 500 })
  }
}

// POST: Añadir un registro de peso
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

    // Verificar permisos (solo el propio usuario o un administrador puede añadir registros)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para modificar este historial" }, { status: 403 })
    }

    // Obtener datos del registro
    const body = await request.json()

    // Validar datos
    if (!body.peso) {
      return NextResponse.json({ error: "El peso es obligatorio" }, { status: 400 })
    }

    // Crear registro
    const nuevoRegistro = await db
      .insert(historialPeso)
      .values({
        usuarioId: params.id,
        peso: body.peso,
        fecha: body.fecha ? new Date(body.fecha) : new Date(),
      })
      .returning()

    // Actualizar también el peso en las metas del usuario si existen
    const metasUsuarioEncontrado = await db.query.metasUsuario.findFirst({
      where: eq(metasUsuario.usuarioId, params.id),
    })

    if (metasUsuarioEncontrado) {
      await db
        .update(metasUsuarioEncontrado)
        .set({
          peso: body.peso,
          fechaActualizacion: new Date(),
        })
        .where(eq(metasUsuario.id, metasUsuarioEncontrado.id))
    }

    return NextResponse.json(nuevoRegistro[0], { status: 201 })
  } catch (error) {
    console.error(`Error al añadir registro de peso al usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al añadir registro de peso" }, { status: 500 })
  }
}

// DELETE: Eliminar un registro de peso específico
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

    // Verificar permisos (solo el propio usuario o un administrador puede eliminar registros)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para modificar este historial" }, { status: 403 })
    }

    // Obtener ID del registro a eliminar
    const { searchParams } = new URL(request.url)
    const registroId = searchParams.get("registroId")

    if (!registroId) {
      return NextResponse.json({ error: "El parámetro registroId es obligatorio" }, { status: 400 })
    }

    // Verificar que el registro existe y pertenece al usuario
    const registro = await db.query.historialPeso.findFirst({
      where: eq(historialPeso.id, Number.parseInt(registroId)),
    })

    if (!registro) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
    }

    if (registro.usuarioId !== params.id) {
      return NextResponse.json({ error: "Este registro no pertenece al usuario especificado" }, { status: 403 })
    }

    // Eliminar registro
    await db.delete(historialPeso).where(eq(historialPeso.id, Number.parseInt(registroId)))

    return NextResponse.json({ message: "Registro eliminado correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar registro de peso del usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar registro de peso" }, { status: 500 })
  }
}
