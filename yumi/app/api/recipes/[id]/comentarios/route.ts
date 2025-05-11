import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { recetas, comentarios, usuarios } from "../../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener comentarios de una receta
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Verificar que la receta existe
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, recetaId),
    })

    if (!receta) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    // Obtener comentarios con información del usuario
    const comentariosReceta = await db.query.comentarios.findMany({
      where: eq(comentarios.recetaId, recetaId),
      with: {
        usuario: true,
      },
      orderBy: (comentarios, { desc }) => [desc(comentarios.fecha)],
      limit,
      offset,
    })

    // Contar total para paginación
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(comentarios)
      .where(eq(comentarios.recetaId, recetaId))

    return NextResponse.json({
      data: comentariosReceta,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error(`Error al obtener comentarios de la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener comentarios" }, { status: 500 })
  }
}

// POST: Añadir comentario a una receta
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)

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

    // Verificar que la receta existe
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, recetaId),
    })

    if (!receta) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    // Obtener datos del comentario
    const body = await request.json()

    // Validar datos
    if (!body.contenido) {
      return NextResponse.json({ error: "El contenido del comentario es obligatorio" }, { status: 400 })
    }

    // Crear comentario
    const nuevoComentario = await db
      .insert(comentarios)
      .values({
        recetaId,
        usuarioId: usuario.id,
        contenido: body.contenido,
        fecha: new Date(),
      })
      .returning()

    // Obtener comentario con información del usuario
    const comentarioConUsuario = await db.query.comentarios.findFirst({
      where: eq(comentarios.id, nuevoComentario[0].id),
      with: {
        usuario: true,
      },
    })

    return NextResponse.json(comentarioConUsuario, { status: 201 })
  } catch (error) {
    console.error(`Error al añadir comentario a la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al añadir comentario" }, { status: 500 })
  }
}
