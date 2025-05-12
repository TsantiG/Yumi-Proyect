import { type NextRequest, NextResponse } from "next/server";
import { db } from "../db";
import { categorias, usuarios } from "../db/schema";
import { sql, like, and, eq } from "drizzle-orm";
import {auth} from "@clerk/nextjs/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const nombre = searchParams.get("nombre");

    const filters = [];

    if (nombre) {
      filters.push(like(categorias.nombre, `%${nombre}%`));
    }

    const whereCondition = filters.length > 0 ? and(...filters) : undefined;

    const resultados = await db
      .select()
      .from(categorias)
      .where(whereCondition)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(categorias)
      .where(whereCondition);

    return NextResponse.json({
      data: resultados,
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const user = await db.query.usuarios.findFirst({ where: eq(usuarios.idClerk, userId) })
    if (!user?.esAdmin) return NextResponse.json({ error: "Solo administradores" }, { status: 403 })

    const body = await request.json();

    if (!body.nombre || typeof body.nombre !== "string") {
      return NextResponse.json(
        { error: "El nombre de la categoría es obligatorio y debe ser una cadena" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una categoría con ese nombre
    const existente = await db.query.categorias.findFirst({
      where: eq(categorias.nombre, body.nombre),
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre" },
        { status: 409 }
      );
    }

    // Crear la nueva categoría
    const [nuevaCategoria] = await db
      .insert(categorias)
      .values({
        nombre: body.nombre,
        descripcion: typeof body.descripcion === "string" ? body.descripcion : null,
      })
      .returning();

    return NextResponse.json(nuevaCategoria, { status: 201 });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}
