import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../../db"
import { recetas, ingredientes, usuarios, unidadesMedida } from "../../../../db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener un ingrediente específico
export async function GET(request: NextRequest, { params }: { params: { id: string; ingredienteId: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const ingredienteId = Number.parseInt(params.ingredienteId)

    // Verificar que el ingrediente existe y pertenece a la receta
    const ingrediente = await db.query.ingredientes.findFirst({
      where: and(eq(ingredientes.id, ingredienteId), eq(ingredientes.recetaId, recetaId)),
      with: {
        unidad: true,
      },
    })

    if (!ingrediente) {
      return NextResponse.json({ error: "Ingrediente no encontrado" }, { status: 404 })
    }

    return NextResponse.json(ingrediente)
  } catch (error) {
    console.error(`Error al obtener ingrediente ${params.ingredienteId}:`, error)
    return NextResponse.json({ error: "Error al obtener ingrediente" }, { status: 500 })
  }
}

// PATCH: Actualizar un ingrediente específico
export async function PATCH(request: NextRequest, { params }: { params: { id: string; ingredienteId: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const ingredienteId = Number.parseInt(params.ingredienteId)

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

    // Verificar que la receta existe y pertenece al usuario
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, recetaId),
    })

    if (!receta) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    if (receta.autorId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar esta receta" }, { status: 403 })
    }

    // Verificar que el ingrediente existe y pertenece a la receta
    const ingredienteActual = await db.query.ingredientes.findFirst({
      where: and(eq(ingredientes.id, ingredienteId), eq(ingredientes.recetaId, recetaId)),
    })

    if (!ingredienteActual) {
      return NextResponse.json({ error: "Ingrediente no encontrado" }, { status: 404 })
    }

    // Obtener datos actualizados
    const body = await request.json()

    // Verificar unidad de medida si se proporciona
    if (body.unidadId) {
      const unidad = await db.query.unidadesMedida.findFirst({
        where: eq(unidadesMedida.id, body.unidadId),
      })

      if (!unidad) {
        return NextResponse.json({ error: "Unidad de medida no encontrada" }, { status: 404 })
      }
    }

    // Actualizar ingrediente
    const ingredienteActualizado = await db
      .update(ingredientes)
      .set({
        nombre: body.nombre || ingredienteActual.nombre,
        cantidad: body.cantidad !== undefined ? body.cantidad : ingredienteActual.cantidad,
        unidadId: body.unidadId || ingredienteActual.unidadId,
        caloriasPorUnidad:
          body.caloriasPorUnidad !== undefined ? body.caloriasPorUnidad : ingredienteActual.caloriasPorUnidad,
        esOpcional: body.esOpcional !== undefined ? body.esOpcional : ingredienteActual.esOpcional,
      })
      .where(eq(ingredientes.id, ingredienteId))
      .returning()

    return NextResponse.json(ingredienteActualizado[0])
  } catch (error) {
    console.error(`Error al actualizar ingrediente ${params.ingredienteId}:`, error)
    return NextResponse.json({ error: "Error al actualizar ingrediente" }, { status: 500 })
  }
}

// DELETE: Eliminar un ingrediente específico
export async function DELETE(request: NextRequest, { params }: { params: { id: string; ingredienteId: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)
    const ingredienteId = Number.parseInt(params.ingredienteId)

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

    // Verificar que la receta existe y pertenece al usuario
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, recetaId),
    })

    if (!receta) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    if (receta.autorId !== usuario.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar esta receta" }, { status: 403 })
    }

    // Verificar que el ingrediente existe y pertenece a la receta
    const ingrediente = await db.query.ingredientes.findFirst({
      where: and(eq(ingredientes.id, ingredienteId), eq(ingredientes.recetaId, recetaId)),
    })

    if (!ingrediente) {
      return NextResponse.json({ error: "Ingrediente no encontrado" }, { status: 404 })
    }

    // Eliminar ingrediente
    await db.delete(ingredientes).where(eq(ingredientes.id, ingredienteId))

    return NextResponse.json({ message: "Ingrediente eliminado correctamente" }, { status: 200 })
  } catch (error) {
    console.error(`Error al eliminar ingrediente ${params.ingredienteId}:`, error)
    return NextResponse.json({ error: "Error al eliminar ingrediente" }, { status: 500 })
  }
}
