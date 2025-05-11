import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { usuarios, preferenciasUsuario, categorias } from "../../../db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener preferencias de un usuario
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

    // Verificar permisos (solo el propio usuario o un administrador puede ver las preferencias)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para ver estas preferencias" }, { status: 403 })
    }

    // Obtener preferencias del usuario con información de categorías
    const preferencias = await db.query.preferenciasUsuario.findMany({
      where: eq(preferenciasUsuario.usuarioId, params.id),
      with: {
        categoria: true,
      },
    })

    return NextResponse.json(preferencias)
  } catch (error) {
    console.error(`Error al obtener preferencias del usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener preferencias" }, { status: 500 })
  }
}

// POST: Añadir una preferencia a un usuario
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

    // Verificar permisos (solo el propio usuario o un administrador puede añadir preferencias)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para modificar estas preferencias" }, { status: 403 })
    }

    // Obtener datos de la preferencia
    const body = await request.json()

    // Validar datos
    if (!body.categoriaId) {
      return NextResponse.json({ error: "El ID de categoría es obligatorio" }, { status: 400 })
    }

    // Verificar que la categoría existe
    const categoriaExistente = await db.query.categorias.findFirst({
      where: eq(categorias.id, body.categoriaId),
    })

    if (!categoriaExistente) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    // Verificar si ya existe esta preferencia
    const preferenciaExistente = await db.query.preferenciasUsuario.findFirst({
      where: and(eq(preferenciasUsuario.usuarioId, params.id), eq(preferenciasUsuario.categoriaId, body.categoriaId)),
    })

    if (preferenciaExistente) {
      return NextResponse.json({ error: "Esta preferencia ya existe" }, { status: 409 })
    }

    // Crear preferencia
    const nuevaPreferencia = await db
      .insert(preferenciasUsuario)
      .values({
        usuarioId: params.id,
        categoriaId: body.categoriaId,
      })
      .returning()

    // Obtener preferencia con información de categoría
    const preferenciaConCategoria = await db.query.preferenciasUsuario.findFirst({
      where: eq(preferenciasUsuario.id, nuevaPreferencia[0].id),
      with: {
        categoria: true,
      },
    })

    return NextResponse.json(preferenciaConCategoria, { status: 201 })
  } catch (error) {
    console.error(`Error al añadir preferencia al usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al añadir preferencia" }, { status: 500 })
  }
}

// DELETE: Eliminar una preferencia específica
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

    // Verificar permisos (solo el propio usuario o un administrador puede eliminar preferencias)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para modificar estas preferencias" }, { status: 403 })
    }

    // Obtener datos de la solicitud
    const { searchParams } = new URL(request.url)
    const categoriaId = searchParams.get("categoriaId")

    if (!categoriaId) {
      return NextResponse.json({ error: "El parámetro categoriaId es obligatorio" }, { status: 400 })
    }

    // Verificar si existe esta preferencia
    const preferenciaExistente = await db.query.preferenciasUsuario.findFirst({
      where: and(
        eq(preferenciasUsuario.usuarioId, params.id),
        eq(preferenciasUsuario.categoriaId, Number.parseInt(categoriaId)),
      ),
    })

    if (!preferenciaExistente) {
      return NextResponse.json({ error: "Preferencia no encontrada" }, { status: 404 })
    }

    // Eliminar preferencia
    await db.delete(preferenciasUsuario).where(eq(preferenciasUsuario.id, preferenciaExistente.id))

    return NextResponse.json({ message: "Preferencia eliminada correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar preferencia del usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar preferencia" }, { status: 500 })
  }
}

// PUT: Actualizar todas las preferencias de un usuario (reemplazar lista completa)
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

    // Verificar que el usuario solicitado existe
    const usuarioSolicitado = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, params.id),
    })

    if (!usuarioSolicitado) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar permisos (solo el propio usuario o un administrador puede actualizar preferencias)
    if (usuarioActual.id !== usuarioSolicitado.id) {
      // Aquí deberías implementar una verificación de roles para administradores
      return NextResponse.json({ error: "No tienes permiso para modificar estas preferencias" }, { status: 403 })
    }

    // Obtener datos de las preferencias
    const body = await request.json()

    if (!Array.isArray(body.categorias)) {
      return NextResponse.json({ error: "Se esperaba un array de IDs de categorías" }, { status: 400 })
    }

    // Verificar que todas las categorías existen
    for (const categoriaId of body.categorias) {
      const categoriaExistente = await db.query.categorias.findFirst({
        where: eq(categorias.id, categoriaId),
      })

      if (!categoriaExistente) {
        return NextResponse.json({ error: `Categoría ${categoriaId} no encontrada` }, { status: 404 })
      }
    }

    // Eliminar preferencias existentes
    await db.delete(preferenciasUsuario).where(eq(preferenciasUsuario.usuarioId, params.id))

    // Si no hay categorías para añadir, devolver lista vacía
    if (body.categorias.length === 0) {
      return NextResponse.json([])
    }

    // Insertar nuevas preferencias
    const nuevasPreferencias = await db
      .insert(preferenciasUsuario)
      .values(
        body.categorias.map((categoriaId: number) => ({
          usuarioId: params.id,
          categoriaId,
        })),
      )
      .returning()

    // Obtener preferencias con información de categorías
    const preferenciasConCategorias = await db.query.preferenciasUsuario.findMany({
      where: eq(preferenciasUsuario.usuarioId, params.id),
      with: {
        categoria: true,
      },
    })

    return NextResponse.json(preferenciasConCategorias)
  } catch (error) {
    console.error(`Error al actualizar preferencias del usuario ${params.id}:`, error)
    return NextResponse.json({ error: "Error al actualizar preferencias" }, { status: 500 })
  }
}
