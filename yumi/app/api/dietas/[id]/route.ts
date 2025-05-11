import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../db"
import { dietas, recetas, dietasUsuario } from "../../db/schema"
import { eq, count } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener una dieta específica con estadísticas
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Obtener dieta
    const dieta = await db.query.dietas.findFirst({
      where: eq(dietas.id, id),
    })

    if (!dieta) {
      return NextResponse.json({ error: "Dieta no encontrada" }, { status: 404 })
    }

    // Contar recetas con esta dieta
    const recetasCount = await db.select({ count: count() }).from(recetas).where(eq(recetas.dietaId, id))

    // Contar usuarios que siguen esta dieta
    const usuariosCount = await db.select({ count: count() }).from(dietasUsuario).where(eq(dietasUsuario.dietaId, id))

    // Combinar datos
    const result = {
      ...dieta,
      recetasCount: recetasCount[0].count,
      usuariosCount: usuariosCount[0].count,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(`Error al obtener dieta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener dieta" }, { status: 500 })
  }
}

// PUT: Actualizar una dieta (solo para administradores)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías verificar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado actualizar dietas

    // Verificar si la dieta existe
    const dietaExistente = await db.query.dietas.findFirst({
      where: eq(dietas.id, id),
    })

    if (!dietaExistente) {
      return NextResponse.json({ error: "Dieta no encontrada" }, { status: 404 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Validar datos
    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre de la dieta es obligatorio" }, { status: 400 })
    }

    // Verificar si ya existe otra dieta con ese nombre
    if (body.nombre !== dietaExistente.nombre) {
      const nombreExistente = await db.query.dietas.findFirst({
        where: eq(dietas.nombre, body.nombre),
      })

      if (nombreExistente) {
        return NextResponse.json({ error: "Ya existe otra dieta con ese nombre" }, { status: 409 })
      }
    }

    // Actualizar dieta
    const dietaActualizada = await db
      .update(dietas)
      .set({
        nombre: body.nombre,
        descripcion: body.descripcion !== undefined ? body.descripcion : dietaExistente.descripcion,
        restricciones: body.restricciones !== undefined ? body.restricciones : dietaExistente.restricciones,
      })
      .where(eq(dietas.id, id))
      .returning()

    return NextResponse.json(dietaActualizada[0])
  } catch (error) {
    console.error(`Error al actualizar dieta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al actualizar dieta" }, { status: 500 })
  }
}

// DELETE: Eliminar una dieta (solo para administradores)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías verificar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado eliminar dietas

    // Verificar si la dieta existe
    const dietaExistente = await db.query.dietas.findFirst({
      where: eq(dietas.id, id),
    })

    if (!dietaExistente) {
      return NextResponse.json({ error: "Dieta no encontrada" }, { status: 404 })
    }

    // Verificar si hay recetas asociadas a esta dieta
    const recetasCount = await db.select({ count: count() }).from(recetas).where(eq(recetas.dietaId, id))

    // Verificar si hay usuarios siguiendo esta dieta
    const usuariosCount = await db.select({ count: count() }).from(dietasUsuario).where(eq(dietasUsuario.dietaId, id))

    // Si hay recetas o usuarios asociados, no permitir eliminar
    if (recetasCount[0].count > 0 || usuariosCount[0].count > 0) {
      return NextResponse.json(
        {
          error: "No se puede eliminar la dieta porque tiene recetas o usuarios asociados",
          recetasCount: recetasCount[0].count,
          usuariosCount: usuariosCount[0].count,
        },
        { status: 409 },
      )
    }

    // Eliminar dieta
    await db.delete(dietas).where(eq(dietas.id, id))

    return NextResponse.json({ message: "Dieta eliminada correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar dieta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al eliminar dieta" }, { status: 500 })
  }
}

