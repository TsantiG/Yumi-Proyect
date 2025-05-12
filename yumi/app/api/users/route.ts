// Archivo: app/api/users/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { db } from "../db"
import { usuarios } from "../db/schema"
import { eq, like, desc, sql, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const currentUser = await db.query.usuarios.findFirst({ where: eq(usuarios.idClerk, userId) })
    if (!currentUser?.esAdmin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    const filters = []
    const nombre = searchParams.get("nombre")
    const email = searchParams.get("email")
    const ordenPor = searchParams.get("ordenar") || "fecha_desc"

    if (nombre) filters.push(like(usuarios.nombre, `%${nombre}%`))
    if (email) filters.push(like(usuarios.email, `%${email}%`))

    const whereCondition = filters.length > 0 ? and(...filters) : undefined

    const resultados = await db.select().from(usuarios)
      .where(whereCondition)
      .orderBy(
        ordenPor === "fecha_asc" ? usuarios.fechaRegistro :
        ordenPor === "nombre_asc" ? usuarios.nombre :
        ordenPor === "nombre_desc" ? desc(usuarios.nombre) :
        desc(usuarios.fechaRegistro)
      )
      .limit(limit).offset(offset)

    const [{ count }] = await db.select({ count: sql`count(*)` }).from(usuarios).where(whereCondition)

    return NextResponse.json({
      data: resultados,
      meta: { total: Number(count), page, limit, totalPages: Math.ceil(Number(count) / limit) }
    })
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await request.json()
    if (!body.idClerk || !body.email) {
      return NextResponse.json({ error: "ID de Clerk y email son obligatorios" }, { status: 400 })
    }

    const existente = await db.query.usuarios.findFirst({ where: eq(usuarios.idClerk, body.idClerk) })
    if (existente) return NextResponse.json({ error: "Usuario con ese ID de Clerk ya existe" }, { status: 409 })

    const emailExistente = await db.query.usuarios.findFirst({ where: eq(usuarios.email, body.email) })
    if (emailExistente) return NextResponse.json({ error: "Usuario con ese email ya existe" }, { status: 409 })

    const nuevo = await db.insert(usuarios).values({
      idClerk: body.idClerk,
      nombre: body.nombre,
      email: body.email,
      urlFotoPerfil: body.urlFotoPerfil || null,
      colorId: body.colorId || null,
      darkMode: body.darkMode || false,
      esAdmin: !!body.esAdmin,
      fechaRegistro: new Date()
    }).returning()

    return NextResponse.json(nuevo[0], { status: 201 })
  } catch (error) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
  }
}
