import { type NextRequest, NextResponse } from "next/server"
import { db } from "../../../db"
import { dietas, dietasUsuario, usuarios } from "../../../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener usuarios que siguen una dieta específica (solo para administradores)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías verificar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado ver esta información

    const id = Number.parseInt(params.id)
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    // Verificar si la dieta existe
    const dieta = await db.query.dietas.findFirst({
      where: eq(dietas.id, id),
    })

    if (!dieta) {
      return NextResponse.json({ error: "Dieta no encontrada" }, { status: 404 })
    }

    // Obtener usuarios que siguen esta dieta
    const usuariosDieta = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        email: usuarios.email,
        urlFotoPerfil: usuarios.urlFotoPerfil,
        fechaRegistro: usuarios.fechaRegistro,
        fechaInicio: dietasUsuario.fechaInicio,
      })
      .from(dietasUsuario)
      .innerJoin(usuarios, eq(dietasUsuario.usuarioId, usuarios.id))
      .where(eq(dietasUsuario.dietaId, id))
      .limit(limit)
      .offset(offset)

    // Contar total para paginación
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(dietasUsuario)
      .where(eq(dietasUsuario.dietaId, id))

    return NextResponse.json({
      dieta,
      usuarios: usuariosDieta,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error(`Error al obtener usuarios de la dieta ${params.id}:`, error)
    return NextResponse.json({ error: "Error al obtener usuarios de la dieta" }, { status: 500 })
  }
}

