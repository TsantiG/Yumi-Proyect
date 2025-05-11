import { type NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { colecciones, usuarios } from "../db/schema"
import { eq, and, like } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { sql } from "drizzle-orm"

// GET: Obtener colecciones del usuario actual o públicas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Filtros
    const nombre = searchParams.get("nombre")
    const soloPublicas = searchParams.get("soloPublicas") === "true"
    const usuarioId = searchParams.get("usuario")

    // Verificar autenticación
    const { userId } = await auth()
    let usuarioActual = null

    if (userId) {
      usuarioActual = await db.query.usuarios.findFirst({
        where: eq(usuarios.idClerk, userId),
      })
    }

    const filters = []

    // Si se solicitan colecciones de un usuario específico
    if (usuarioId) {
      filters.push(eq(colecciones.usuarioId, usuarioId))

      // Si no es el propio usuario, mostrar solo colecciones públicas
      if (!usuarioActual || usuarioActual.id !== usuarioId) {
        filters.push(eq(colecciones.esPublica, true))
      }
    } else if (soloPublicas) {
      // Mostrar solo colecciones públicas
      filters.push(eq(colecciones.esPublica, true))
    } else if (usuarioActual) {
      // Mostrar colecciones del usuario actual
      filters.push(eq(colecciones.usuarioId, usuarioActual.id))
    } else {
      // Si no hay usuario autenticado y no se especifica un usuario, mostrar solo públicas
      filters.push(eq(colecciones.esPublica, true))
    }

    // Filtrar por nombre si se proporciona
    if (nombre) {
      filters.push(like(colecciones.nombre, `%${nombre}%`))
    }

    // Construir la consulta
    let query = db
      .select({
        id: colecciones.id,
        nombre: colecciones.nombre,
        descripcion: colecciones.descripcion,
        esPublica: colecciones.esPublica,
        fechaCreacion: colecciones.fechaCreacion,
        usuarioId: colecciones.usuarioId,
        usuarioNombre: usuarios.nombre,
        usuarioFoto: usuarios.urlFotoPerfil,
      })
      .from(colecciones)
      .leftJoin(usuarios, eq(colecciones.usuarioId, usuarios.id))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(colecciones.fechaCreacion)
      .limit(limit)
      .offset(offset)

    // Ejecutar query
    const resultados = await query

    // Contar total para paginación
    const countQuery = db.select({ count: sql`count(*)` }).from(colecciones)
    if (filters.length > 0) {
      countQuery.where(and(...filters))
    }
    const [{ count }] = await countQuery

    return NextResponse.json({
      data: resultados,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    })
  } catch (error) {
    console.error("Error al obtener colecciones:", error)
    return NextResponse.json({ error: "Error al obtener colecciones" }, { status: 500 })
  }
}

// POST: Crear una nueva colección
export async function POST(request: NextRequest) {
  try {
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

    // Obtener datos de la colección
    const body = await request.json()

    // Validar datos
    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre de la colección es obligatorio" }, { status: 400 })
    }

    // Crear la colección
    const nuevaColeccion = await db
      .insert(colecciones)
      .values({
        usuarioId: usuario.id,
        nombre: body.nombre,
        descripcion: body.descripcion || null,
        esPublica: body.esPublica || false,
        fechaCreacion: new Date(),
      })
      .returning()

    return NextResponse.json(nuevaColeccion[0], { status: 201 })
  } catch (error) {
    console.error("Error al crear colección:", error)
    return NextResponse.json({ error: "Error al crear colección" }, { status: 500 })
  }
}

