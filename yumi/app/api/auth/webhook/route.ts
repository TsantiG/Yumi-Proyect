// import { Webhook } from "svix"
// import { headers } from "next/headers"
// import type { WebhookEvent } from "@clerk/nextjs/server"
// import { NextResponse } from "next/server"
// import { db } from "../../db"
// import { usuarios } from "../../db/schema"
// import { eq } from "drizzle-orm"

// // Esta función maneja los webhooks de Clerk para sincronizar los datos de usuario
// export async function POST(req: Request) {
//   // Verificar la firma del webhook para seguridad
//   const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

//   if (!WEBHOOK_SECRET) {
//     console.error("CLERK_WEBHOOK_SECRET no está configurado")
//     return new NextResponse("Webhook secret no configurado", { status: 500 })
//   }

//   // Obtener los headers para verificar la firma
//   const headerPayload = headers()
//   const svix_id = headerPayload.get("svix-id")
//   const svix_timestamp = headerPayload.get("svix-timestamp")
//   const svix_signature = headerPayload.get("svix-signature")

//   // Si falta algún header requerido, devolver error
//   if (!svix_id || !svix_timestamp || !svix_signature) {
//     return new NextResponse("Headers de webhook inválidos", { status: 400 })
//   }

//   // Obtener el cuerpo de la solicitud
//   const payload = await req.json()
//   const body = JSON.stringify(payload)

//   // Crear una instancia de Webhook para verificar la firma
//   const wh = new Webhook(WEBHOOK_SECRET)

//   let evt: WebhookEvent

//   try {
//     // Verificar la firma
//     evt = wh.verify(body, {
//       "svix-id": svix_id,
//       "svix-timestamp": svix_timestamp,
//       "svix-signature": svix_signature,
//     }) as WebhookEvent
//   } catch (err) {
//     console.error("Error al verificar webhook:", err)
//     return new NextResponse("Error al verificar webhook", { status: 400 })
//   }

//   // Manejar diferentes tipos de eventos
//   const eventType = evt.type

//   console.log(`Webhook recibido: ${eventType}`)

//   try {
//     if (eventType === "user.created") {
//       // Crear un nuevo usuario en nuestra base de datos
//       await db.insert(usuarios).values({
//         idClerk: evt.data.id,
//         email: evt.data.email_addresses[0]?.email_address,
//         nombre: `${evt.data.first_name || ""} ${evt.data.last_name || ""}`.trim() || null,
//         urlFotoPerfil: evt.data.image_url,
//         fechaRegistro: new Date(),
//       })

//       console.log(`Usuario creado: ${evt.data.id}`)
//     } else if (eventType === "user.updated") {
//       // Actualizar un usuario existente
//       await db
//         .update(usuarios)
//         .set({
//           email: evt.data.email_addresses[0]?.email_address,
//           nombre: `${evt.data.first_name || ""} ${evt.data.last_name || ""}`.trim() || null,
//           urlFotoPerfil: evt.data.image_url,
//           ultimaActualizacion: new Date(),
//         })
//         .where(eq(usuarios.idClerk, evt.data.id))

//       console.log(`Usuario actualizado: ${evt.data.id}`)
//     } else if (eventType === "user.deleted") {
//       // Eliminar un usuario
//       await db.delete(usuarios).where(eq(usuarios.idClerk, evt.data.id))

//       console.log(`Usuario eliminado: ${evt.data.id}`)
//     }

//     return NextResponse.json({ success: true })
//   } catch (error) {
//     console.error(`Error al procesar webhook ${eventType}:`, error)
//     return new NextResponse("Error al procesar webhook", { status: 500 })
//   }
// }
