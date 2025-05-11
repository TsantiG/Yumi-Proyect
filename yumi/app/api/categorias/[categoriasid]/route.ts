import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { categorias, recetas } from "../../db/schema"
import { eq, count } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener una categoría específica con conteo de recetas
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Obtener categoría
    const categoria = await db.query.categorias.findFirst({
      where: eq(categorias.id, id),
    })

    if (!categoria) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    // Contar recetas en esta categoría
    const recetasCount = await db.select({ count: count() }).from(recetas).where(eq(recetas.categoriaId, id))

    // Combinar datos
    const result = {
      ...categoria,
      recetasCount: recetasCount[0].count,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error al obtener categoría ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener categoría" }, { status: 500 })
  }
}

// PUT: Actualizar una categoría (solo para administradores)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías verificar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado actualizar categorías

    // Verificar si la categoría existe
    const categoriaExistente = await db.query.categorias.findFirst({
      where: eq(categorias.id, id),
    })

    if (!categoriaExistente) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Validar datos
    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre de la categoría es obligatorio" }, { status: 400 })
    }

    // Verificar si ya existe otra categoría con ese nombre
    if (body.nombre !== categoriaExistente.nombre) {
      const nombreExistente = await db.query.categorias.findFirst({
        where: eq(categorias.nombre, body.nombre),
      })

      if (nombreExistente) {
        return NextResponse.json({ error: "Ya existe otra categoría con ese nombre" }, { status: 409 })
      }
    }

    // Actualizar categoría
    const categoriaActualizada = await db
      .update(categorias)
      .set({
        nombre: body.nombre,
        descripcion: body.descripcion || categoriaExistente.descripcion,
      })
      .where(eq(categorias.id, id))
      .returning()

    return NextResponse.json(categoriaActualizada[0])
  } catch (error) {
    console.error(`Error al actualizar categoría ${params.id}:`, error)
    return NextResponse.json({ error: "Error al actualizar categoría" }, { status: 500 })
  }
}

// DELETE: Eliminar una categoría (solo para administradores)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías verificar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado eliminar categorías

    // Verificar si la categoría existe
    const categoriaExistente = await db.query.categorias.findFirst({
      where: eq(categorias.id, id),
    })

    if (!categoriaExistente) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    // Verificar si hay recetas asociadas a esta categoría
    const recetasCount = await db.select({ count: count() }).from(recetas).where(eq(recetas.categoriaId, id))

    if (recetasCount[0].count > 0) {
      return NextResponse.json(
        {
          error: "No se puede eliminar la categoría porque tiene recetas asociadas",
          recetasCount: recetasCount[0].count,
        },
        { status: 409 },
      )
    }

    // Eliminar categoría
    await db.delete(categorias).where(eq(categorias.id, id))

    return NextResponse.json({ message: "Categoría eliminada correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar categoría ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 })
  }
}

