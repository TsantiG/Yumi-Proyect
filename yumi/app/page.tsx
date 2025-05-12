import Image from "next/image";
import NavHome from "@/ui/common/nav-home";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <NavHome />
      
      </main>
    </div>
  );
}


// import Link from "next/link"
// import { auth } from "@clerk/nextjs/server"
// import { db } from "./api/db"
// import { recetas, usuarios } from "./api/db/schema"
// import { eq, desc } from "drizzle-orm"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// export default async function Home() {
//   const { userId } = await auth()

//   // Obtener recetas destacadas (las más recientes)
//   const recetasDestacadas = await db.query.recetas.findMany({
//     with: {
//       autor: true,
//       dieta: true,
//       puntuaciones: true,
//     },
//     orderBy: [desc(recetas.fechaCreacion)],
//     limit: 6,
//   })

//   // Calcular puntuación promedio para cada receta
//   const recetasConPuntuacion = recetasDestacadas.map((receta) => {
//     const puntuaciones = receta.puntuaciones || []
//     const totalPuntuaciones = puntuaciones.length
//     const sumaPuntuaciones = puntuaciones.reduce((sum, p) => sum + p.puntuacion, 0)
//     const promedioPuntuacion = totalPuntuaciones > 0 ? sumaPuntuaciones / totalPuntuaciones : 0

//     return {
//       ...receta,
//       puntuacionPromedio: promedioPuntuacion,
//       totalPuntuaciones,
//     }
//   })

//   // Verificar si el usuario está autenticado y obtener información
//   let usuarioActual = null
//   if (userId) {
//     usuarioActual = await db.query.usuarios.findFirst({
//       where: eq(usuarios.idClerk, userId),
//     })
//   }

//   return (
//     <main className="flex min-h-screen flex-col items-center">
//       {/* Hero Section */}
//       <section className="w-full bg-gradient-to-r from-green-50 to-teal-50 py-20">
//         <div className="container mx-auto px-4 text-center">
//           <h1 className="mb-6 text-5xl font-bold text-gray-900">Descubre el placer de cocinar saludable</h1>
//           <p className="mb-8 text-xl text-gray-700">
//             Miles de recetas saludables, planificación de comidas y herramientas nutricionales para ayudarte a vivir
//             mejor.
//           </p>
//           <div className="flex flex-wrap justify-center gap-4">
//             {userId ? (
//               <Link href="/home">
//                 <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
//                   Mi Dashboard
//                 </Button>
//               </Link>
//             ) : (
//               <>
//                 <Link href="/login">
//                   <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
//                     Iniciar Sesión
//                   </Button>
//                 </Link>
//                 <Link href="/registro">
//                   <Button size="lg" variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50">
//                     Registrarse
//                   </Button>
//                 </Link>
//               </>
//             )}
//           </div>
//         </div>
//       </section>

//       {/* Recetas Destacadas */}
//       <section className="container mx-auto my-16 px-4">
//         <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">Recetas Destacadas</h2>
//         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
//           {recetasConPuntuacion.map((receta) => (
//             <Card key={receta.id} className="overflow-hidden transition-all hover:shadow-lg">
//               <div className="aspect-video overflow-hidden">
//                 {receta.imagenUrl ? (
//                   <img
//                     src={receta.imagenUrl || "/placeholder.svg"}
//                     alt={receta.titulo}
//                     className="h-full w-full object-cover transition-transform hover:scale-105"
//                   />
//                 ) : (
//                   <div className="flex h-full w-full items-center justify-center bg-gray-100">
//                     <span className="text-gray-400">Sin imagen</span>
//                   </div>
//                 )}
//               </div>
//               <CardHeader>
//                 <CardTitle className="line-clamp-1">{receta.titulo}</CardTitle>
//                 <CardDescription>
//                   {receta.autor?.nombre || "Usuario anónimo"} • {receta.dieta?.nombre || "Sin dieta específica"}
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <p className="line-clamp-2 text-gray-600">{receta.descripcion || "Sin descripción"}</p>
//                 <div className="mt-2 flex items-center">
//                   <div className="flex items-center">
//                     <span className="mr-1 text-yellow-500">★</span>
//                     <span>{receta.puntuacionPromedio.toFixed(1)}</span>
//                   </div>
//                   <span className="mx-2 text-gray-300">•</span>
//                   <span className="text-sm text-gray-500">
//                     {receta.tiempoPreparacion + (receta.tiempoCoccion || 0)} min
//                   </span>
//                   <span className="mx-2 text-gray-300">•</span>
//                   <span className="text-sm text-gray-500">{receta.dificultad || "Fácil"}</span>
//                 </div>
//               </CardContent>
//               <CardFooter>
//                 <Link href={`/recetas/${receta.id}`} className="w-full">
//                   <Button variant="outline" className="w-full">
//                     Ver Receta
//                   </Button>
//                 </Link>
//               </CardFooter>
//             </Card>
//           ))}
//         </div>
//         <div className="mt-8 text-center">
//           <Link href="/recetas">
//             <Button variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50">
//               Ver todas las recetas
//             </Button>
//           </Link>
//         </div>
//       </section>

//       {/* Características */}
//       <section className="w-full bg-gray-50 py-16">
//         <div className="container mx-auto px-4">
//           <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">¿Por qué usar nuestra plataforma?</h2>
//           <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
//             <div className="rounded-lg bg-white p-6 shadow-md">
//               <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600">
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="h-6 w-6"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
//                   />
//                 </svg>
//               </div>
//               <h3 className="mb-2 text-xl font-semibold">Planificación de Comidas</h3>
//               <p className="text-gray-600">
//                 Organiza tus comidas semanales y genera automáticamente listas de compras para ahorrar tiempo y dinero.
//               </p>
//             </div>
//             <div className="rounded-lg bg-white p-6 shadow-md">
//               <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600">
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="h-6 w-6"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
//                   />
//                 </svg>
//               </div>
//               <h3 className="mb-2 text-xl font-semibold">Seguimiento Nutricional</h3>
//               <p className="text-gray-600">
//                 Controla tu ingesta calórica y sigue tu progreso con nuestras herramientas de seguimiento nutricional
//                 personalizadas.
//               </p>
//             </div>
//             <div className="rounded-lg bg-white p-6 shadow-md">
//               <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600">
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="h-6 w-6"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
//                   />
//                 </svg>
//               </div>
//               <h3 className="mb-2 text-xl font-semibold">Comunidad Activa</h3>
//               <p className="text-gray-600">
//                 Conecta con otros entusiastas de la cocina saludable, comparte tus creaciones y participa en eventos
//                 culinarios.
//               </p>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* CTA */}
//       <section className="container mx-auto my-16 px-4">
//         <div className="rounded-xl bg-gradient-to-r from-teal-500 to-green-500 p-8 text-center text-white shadow-lg">
//           <h2 className="mb-4 text-3xl font-bold">¿Listo para empezar tu viaje culinario?</h2>
//           <p className="mb-6 text-lg">
//             Únete a miles de personas que ya están disfrutando de una alimentación más saludable y deliciosa.
//           </p>
//           {!userId && (
//             <Link href="/registro">
//               <Button size="lg" className="bg-white text-teal-600 hover:bg-gray-100">
//                 Crear una cuenta gratis
//               </Button>
//             </Link>
//           )}
//         </div>
//       </section>
//     </main>
//   )
// }
