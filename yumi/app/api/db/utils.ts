import { db } from "./index"
import { eq, and, sql } from "drizzle-orm"
import { usuarios, favoritos } from "./schema"

// Función para obtener un usuario por su ID de Clerk
export async function getUserByClerkId(clerkId: string) {
  try {
    const user = await db.query.usuarios.findFirst({
      where: eq(usuarios.idClerk, clerkId),
      with: {
        metas: true,
        preferencias: {
          with: {
            categoria: true,
          },
        },
        dietas: {
          with: {
            dieta: true,
          },
        },
      },
    })

    return user
  } catch (error) {
    console.error("Error al obtener usuario por ID de Clerk:", error)
    throw error
  }
}

// Función para crear o actualizar un usuario
export async function upsertUser(userData: {
  idClerk: string
  nombre?: string
  email?: string
  urlFotoPerfil?: string
}) {
  try {
    // Verificar si el usuario ya existe
    const existingUser = await getUserByClerkId(userData.idClerk)

    if (existingUser) {
      // Actualizar usuario existente
      await db
        .update(usuarios)
        .set({
          nombre: userData.nombre ?? existingUser.nombre,
          email: userData.email ?? existingUser.email,
          urlFotoPerfil: userData.urlFotoPerfil ?? existingUser.urlFotoPerfil,
          ultimaActualizacion: new Date(),
        })
        .where(eq(usuarios.idClerk, userData.idClerk))

      return await getUserByClerkId(userData.idClerk)
    } else {
      // Crear nuevo usuario
      const [newUser] = await db
        .insert(usuarios)
        .values({
          idClerk: userData.idClerk,
          nombre: userData.nombre,
          email: userData.email,
          urlFotoPerfil: userData.urlFotoPerfil,
        })
        .returning()

      return newUser
    }
  } catch (error) {
    console.error("Error al crear/actualizar usuario:", error)
    throw error
  }
}

// Función para calcular el promedio de puntuaciones de una receta
export async function getRecipeAverageRating(recipeId: number) {
  try {
    const result = await db.execute(
      sql`SELECT AVG(puntuacion) as promedio, COUNT(*) as total 
          FROM puntuaciones 
          WHERE receta_id = ${recipeId}`,
    )

    return result.rows[0] as { promedio: number; total: number }
  } catch (error) {
    console.error("Error al calcular promedio de puntuaciones:", error)
    throw error
  }
}

// Función para verificar si un usuario ha marcado como favorita una receta
export async function isRecipeFavorite(userId: string, recipeId: number) {
  try {
    const user = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, userId),
    })

    if (!user) return false

    const favorite = await db.query.favoritos.findFirst({
      where: and(eq(favoritos.usuarioId, user.id), eq(favoritos.recetaId, recipeId)),
    })

    return !!favorite
  } catch (error) {
    console.error("Error al verificar favorito:", error)
    throw error
  }
}
