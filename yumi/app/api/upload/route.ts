import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { auth } from "@clerk/nextjs/server"

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el formulario con la imagen
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folder = formData.get("folder") as string | null
    const tipo = formData.get("tipo") as string | null // receta, perfil, intento, evento, etc.

    if (!file) {
      return NextResponse.json({ error: "No se ha proporcionado ningún archivo" }, { status: 400 })
    }

    // Validar tipo de archivo
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no válido. Solo se permiten imágenes JPEG, PNG, WebP y GIF" },
        { status: 400 },
      )
    }

    // Validar tamaño del archivo (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. El tamaño máximo permitido es 5MB" },
        { status: 400 },
      )
    }

    // Convertir el archivo a un buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determinar la carpeta de destino en Cloudinary
    let uploadFolder = "yumi"
    if (folder) {
      uploadFolder += `/${folder}`
    } else if (tipo) {
      uploadFolder += `/${tipo}`
    }

    // Subir la imagen a Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: uploadFolder,
          resource_type: "image",
          public_id: `${Date.now()}`,
          transformation: [
            { quality: "auto:good" }, // Optimizar calidad
            { fetch_format: "auto" }, // Formato automático según el navegador
          ],
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        },
      )

      // Escribir el buffer en el stream
      const cloudinaryUploadStream = require("stream")
      const bufferStream = new cloudinaryUploadStream.PassThrough()
      bufferStream.end(buffer)
      bufferStream.pipe(uploadStream)
    })

    const uploadResult = await uploadPromise as any

    // Devolver la URL y otros datos de la imagen
    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      resourceType: uploadResult.resource_type,
    })
  } catch (error) {
    console.error("Error al subir imagen:", error)
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el publicId de la imagen a eliminar
    const { searchParams } = new URL(request.url)
    const publicId = searchParams.get("publicId")

    if (!publicId) {
      return NextResponse.json({ error: "No se ha proporcionado el ID público de la imagen" }, { status: 400 })
    }

    // Eliminar la imagen de Cloudinary
    const deletePromise = new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })

    const deleteResult = await deletePromise

    // Devolver el resultado
    return NextResponse.json({
      message: "Imagen eliminada correctamente",
      result: deleteResult,
    })
  } catch (error) {
    console.error("Error al eliminar imagen:", error)
    return NextResponse.json({ error: "Error al eliminar la imagen" }, { status: 500 })
  }
}

