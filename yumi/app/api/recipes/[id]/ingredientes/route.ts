import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { recetas, ingredientes, usuarios, unidadesMedida } from "../../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener ingredientes de una receta
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const recetaId = Number.parseInt(params.id)

    // Verificar que la receta existe
    const receta = await db.query.recetas.findFirst({
      where: eq(recetas.id, recetaId),
    })

    if (!receta) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    // Obtener ingredientes con sus unidades de medida
    const ingredientesReceta = await db.query.ingredientes.findMany({
      where: eq(ingredientes.recetaId, recetaId),
      with: {
        unidad: true,
      },
      orderBy: (ingredientes, { asc }) => [asc(ingredientes.id)],
    })

    return NextResponse.json(ingredientesReceta)
  } catch (error) {
    console.error(`Error al obtener ingredientes de la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener ingredientes" }, { status: 500 })
  }
}

// POST: Añadir ingrediente a una receta
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

    // Obtener datos del ingrediente
    const body = await request.json()

    // Validar datos
    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre del ingrediente es obligatorio" }, { status: 400 })
    }

    // Verificar que la unidad de medida existe si se proporciona
    if (body.unidadId) {
      const unidad = await db.query.unidadesMedida.findFirst({
        where: eq(unidadesMedida.id, body.unidadId),
      })

      if (!unidad) {
        return NextResponse.json({ error: "Unidad de medida no encontrada" }, { status: 404 })
      }
    }

    // Crear ingrediente
    const nuevoIngrediente = await db
      .insert(ingredientes)
      .values({
        recetaId,
        nombre: body.nombre,
        cantidad: body.cantidad,
        unidadId: body.unidadId,
        caloriasPorUnidad: body.caloriasPorUnidad,
        esOpcional: body.esOpcional || false,
      })
      .returning()

    return NextResponse.json(nuevoIngrediente[0], { status: 201 })
  } catch (error) {
    console.error(`Error al añadir ingrediente a la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al añadir ingrediente" }, { status: 500 })
  }
}

// PUT: Actualizar todos los ingredientes de una receta (reemplazar lista completa)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Obtener lista de ingredientes
    const body = await request.json()

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Se esperaba un array de ingredientes" }, { status: 400 })
    }

    // Validar cada ingrediente
    for (const ingrediente of body) {
      if (!ingrediente.nombre) {
        return NextResponse.json({ error: "Todos los ingredientes deben tener un nombre" }, { status: 400 })
      }

      // Verificar unidad de medida si se proporciona
      if (ingrediente.unidadId) {
        const unidad = await db.query.unidadesMedida.findFirst({
          where: eq(unidadesMedida.id, ingrediente.unidadId),
        })

        if (!unidad) {
          return NextResponse.json({ error: `Unidad de medida ${ingrediente.unidadId} no encontrada` }, { status: 404 })
        }
      }
    }

    // Eliminar ingredientes existentes
    await db.delete(ingredientes).where(eq(ingredientes.recetaId, recetaId))

    // Insertar nuevos ingredientes
    const nuevosIngredientes = await db
      .insert(ingredientes)
      .values(
        body.map((ingrediente) => ({
          recetaId,
          nombre: ingrediente.nombre,
          cantidad: ingrediente.cantidad,
          unidadId: ingrediente.unidadId,
          caloriasPorUnidad: ingrediente.caloriasPorUnidad,
          esOpcional: ingrediente.esOpcional || false,
        })),
      )
      .returning()

    return NextResponse.json(nuevosIngredientes)
  } catch (error) {
    console.error(`Error al actualizar ingredientes de la receta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al actualizar ingredientes" }, { status: 500 })
  }
}
