import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { recetas, intentosRecetas, usuarios } from "../../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener intentos de una receta
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

    // Obtener intentos con información del usuario
    const intentosReceta = await db.query.intentosRecetas.findMany({
      where: eq(intentosRecetas.recetaId, recetaId),
      with: {
        usuario: true,
      },
      orderBy: (intentosRecetas, { desc }) => [desc(intentosRecetas.fecha)],
      limit,
      offset,
    })

    // Contar total para paginación
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(intentosRecetas)
      .where(eq(intentosRecetas.recetaId, recetaId))

    return NextResponse.json({
      data: intentosReceta,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error(`Error al obtener intentos de la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener intentos" }, { status: 500 })
  }
}

// POST: Añadir intento a una receta
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

    // Obtener datos del intento
    const body = await request.json()

    // Validar datos
    if (!body.imagenUrl) {
      return NextResponse.json({ error: "La imagen del intento es obligatoria" }, { status: 400 })
    }

    // Crear intento
    const nuevoIntento = await db
      .insert(intentosRecetas)
      .values({
        recetaId,
        usuarioId: usuario.id,
        imagenUrl: body.imagenUrl,
        comentario: body.comentario || null,
        fecha: new Date(),
      })
      .returning()

    // Obtener intento con información del usuario
    const intentoConUsuario = await db.query.intentosRecetas.findFirst({
      where: eq(intentosRecetas.id, nuevoIntento[0].id),
      with: {
        usuario: true,
      },
    })

    return NextResponse.json(intentoConUsuario, { status: 201 })
  } catch (error) {
    console.error(`Error al añadir intento a la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al añadir intento" }, { status: 500 })
  }
}
