 // CRUD de usuarios, por hacer.import { type NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { usuarios } from "../db/schema"
import { eq, like, desc, sql, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// GET: Obtener usuarios con paginación y filtros (solo para administradores)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías verificar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado ver la lista de usuarios

    const { searchParams } = new URL(request.url)

    // Parámetros de paginación
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    // Filtros
    const nombre = searchParams.get("nombre")
    const email = searchParams.get("email")
    const ordenPor = searchParams.get("ordenar") || "fecha_desc" // fecha_desc, nombre_asc, etc.

    const filters = []

    // Aplicar filtros si existen
    if (nombre) {
      filters.push(like(usuarios.nombre, `%${nombre}%`))
    }

    if (email) {
      filters.push(like(usuarios.email, `%${email}%`))
    }

    // Construir la consulta base
    let query = db
      .select()
      .from(usuarios)
      .where(filters.length > 0 ? sql`${and(...filters)}` : undefined)

    // Aplicar ordenamiento
    if (ordenPor === "fecha_desc") {
      query = query.orderBy(desc(usuarios.fechaRegistro))
    } else if (ordenPor === "fecha_asc") {
      query = query.orderBy(usuarios.fechaRegistro)
    } else if (ordenPor === "nombre_asc") {
      query = query.orderBy(usuarios.nombre)
    } else if (ordenPor === "nombre_desc") {
      query = query.orderBy(desc(usuarios.nombre))
    }

    // Aplicar paginación
    query = query.limit(limit).offset(offset)

    // Ejecutar query
    const resultados = await query

    // Contar total para paginación
    const countQuery = db.select({ count: sql`count(*)` }).from(usuarios)
    if (filters.length > 0) {
      countQuery.where(sql`${and(...filters)}`)
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
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 })
  }
}

// POST: Crear un nuevo usuario (solo para administradores o sistema)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Aquí deberías verificar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado crear usuarios

    // Obtener datos del usuario del cuerpo de la solicitud
    const body = await request.json()

    // Validar datos
    if (!body.idClerk || !body.email) {
      return NextResponse.json({ error: "ID de Clerk y email son obligatorios" }, { status: 400 })
    }

    // Verificar si ya existe un usuario con ese ID de Clerk o email
    const usuarioExistente = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, body.idClerk),
    })

    if (usuarioExistente) {
      return NextResponse.json({ error: "Ya existe un usuario con ese ID de Clerk" }, { status: 409 })
    }

    const emailExistente = await db.query.usuarios.findFirst({
      where: eq(usuarios.email, body.email),
    })

    if (emailExistente) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })
    }

    // Crear el usuario
    const nuevoUsuario = await db
      .insert(usuarios)
      .values({
        idClerk: body.idClerk,
        nombre: body.nombre,
        email: body.email,
        urlFotoPerfil: body.urlFotoPerfil,
        colorId: body.colorId,
        darkMode: body.darkMode || false,
        fechaRegistro: new Date(),
      })
      .returning()

    return NextResponse.json(nuevoUsuario[0], { status: 201 })
  } catch (error) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
  }
}
