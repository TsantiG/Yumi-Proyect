// import { auth } from "@clerk/nextjs/server"
// import { redirect } from "next/navigation"
// import Link from "next/link"
// import { db } from "../api/db"
// import { usuarios, recetas, favoritos, colecciones, planComidas } from "../api/db/schema"
// import { eq, desc } from "drizzle-orm"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"

// export default async function HomePage() {
//   const { userId } = await auth()

//   // Redirigir si no hay usuario autenticado
//   if (!userId) {
//     redirect("/login")
//   }

//   // Obtener información del usuario
//   const usuario = await db.query.usuarios.findFirst({
//     where: eq(usuarios.idClerk, userId),
//     with: {
//       metas: true,
//       preferencias: {
//         with: {
//           categoria: true,
//         },
//       },
//       dietas: {
//         with: {
//           dieta: true,
//         },
//       },
//       historialPeso: {
//         orderBy: (historialPeso, { desc }) => [desc(historialPeso.fecha)],
//         limit: 1,
//       },
//       color: true,
//     },
//   })

//   if (!usuario) {
//     // Si no existe el usuario en nuestra base de datos, redirigir a completar perfil
//     redirect("/perfil/completar")
//   }

//   // Obtener estadísticas del usuario
//   const recetasCreadas = await db.query.recetas.findMany({
//     where: eq(recetas.autorId, usuario.id),
//     limit: 3,
//     orderBy: [desc(recetas.fechaCreacion)],
//   })

//   const recetasFavoritas = await db.query.favoritos.findMany({
//     where: eq(favoritos.usuarioId, usuario.id),
//     with: {
//       receta: true,
//     },
//     limit: 3,
//     orderBy: (favoritos, { desc }) => [desc(favoritos.fechaAgregado)],
//   })

//   const coleccionesUsuario = await db.query.colecciones.findMany({
//     where: eq(colecciones.usuarioId, usuario.id),
//     limit: 3,
//     orderBy: [desc(colecciones.fechaCreacion)],
//   })

//   const planesComida = await db.query.planComidas.findMany({
//     where: eq(planComidas.usuarioId, usuario.id),
//     limit: 1,
//     orderBy: [desc(planComidas.fechaCreacion)],
//   })

//   // Determinar si el usuario es administrador
//   const esAdmin = usuario.esAdmin || false

//   return (
//     <div className="container mx-auto px-4 py-8">
//       <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
//         <div>
//           <h1 className="text-3xl font-bold">Bienvenido, {usuario.nombre || "Usuario"}</h1>
//           <p className="text-gray-600">¿Qué vas a cocinar hoy?</p>
//         </div>
//         <div className="flex gap-2">
//           <Link href="/recetas/crear">
//             <Button className="bg-teal-600 hover:bg-teal-700">Crear Receta</Button>
//           </Link>
//           <Link href="/plan-comidas">
//             <Button variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50">
//               Planificar Comidas
//             </Button>
//           </Link>
//         </div>
//       </div>

//       {/* Sección de Metas y Progreso */}
//       <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
//         <Card>
//           <CardHeader>
//             <CardTitle>Metas Nutricionales</CardTitle>
//           </CardHeader>
//           <CardContent>
//             {usuario.metas && usuario.metas.length > 0 ? (
//               <div className="space-y-2">
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Calorías diarias:</span>
//                   <span className="font-medium">{usuario.metas[0].limiteCalorías || "No definido"}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Propósito:</span>
//                   <span className="font-medium">{usuario.metas[0].proposito || "No definido"}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-600">Actividad:</span>
//                   <span className="font-medium">{usuario.metas[0].actividadDiaria || "No definido"}</span>
//                 </div>
//               </div>
//             ) : (
//               <div className="text-center">
//                 <p className="mb-4 text-gray-500">No has definido tus metas nutricionales</p>
//                 <Link href="/perfil/metas">
//                   <Button variant="outline" size="sm">
//                     Definir Metas
//                   </Button>
//                 </Link>
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Peso Actual</CardTitle>
//           </CardHeader>
//           <CardContent>
//             {usuario.historialPeso && usuario.historialPeso.length > 0 ? (
//               <div className="text-center">
//                 <p className="mb-2 text-4xl font-bold">{usuario.historialPeso[0].peso} kg</p>
//                 <p className="text-sm text-gray-500">
//                   Actualizado: {new Date(usuario.historialPeso[0].fecha).toLocaleDateString()}
//                 </p>
//                 <Link href="/perfil/historial-peso" className="mt-4 block text-sm text-teal-600 hover:underline">
//                   Ver historial completo
//                 </Link>
//               </div>
//             ) : (
//               <div className="text-center">
//                 <p className="mb-4 text-gray-500">No has registrado tu peso</p>
//                 <Link href="/perfil/historial-peso">
//                   <Button variant="outline" size="sm">
//                     Registrar Peso
//                   </Button>
//                 </Link>
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Dietas y Preferencias</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4">
//               <div>
//                 <h4 className="mb-2 font-medium">Dietas:</h4>
//                 {usuario.dietas && usuario.dietas.length > 0 ? (
//                   <div className="flex flex-wrap gap-2">
//                     {usuario.dietas.map((d) => (
//                       <span key={d.dietaId} className="rounded-full bg-teal-100 px-3 py-1 text-xs text-teal-800">
//                         {d.dieta.nombre}
//                       </span>
//                     ))}
//                   </div>
//                 ) : (
//                   <p className="text-sm text-gray-500">No has seleccionado dietas</p>
//                 )}
//               </div>
//               <div>
//                 <h4 className="mb-2 font-medium">Preferencias:</h4>
//                 {usuario.preferencias && usuario.preferencias.length > 0 ? (
//                   <div className="flex flex-wrap gap-2">
//                     {usuario.preferencias.map((p) => (
//                       <span key={p.categoriaId} className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">
//                         {p.categoria.nombre}
//                       </span>
//                     ))}
//                   </div>
//                 ) : (
//                   <p className="text-sm text-gray-500">No has seleccionado preferencias</p>
//                 )}
//               </div>
//             </div>
//           </CardContent>
//           <CardFooter>
//             <Link href="/perfil/preferencias" className="w-full">
//               <Button variant="outline" className="w-full" size="sm">
//                 Editar Preferencias
//               </Button>
//             </Link>
//           </CardFooter>
//         </Card>
//       </div>

//       {/* Sección de Recetas y Colecciones */}
//       <div className="mb-8">
//         <h2 className="mb-4 text-2xl font-bold">Tus Recetas</h2>
//         {recetasCreadas.length > 0 ? (
//           <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
//             {recetasCreadas.map((receta) => (
//               <Card key={receta.id} className="overflow-hidden">
//                 <div className="aspect-video overflow-hidden">
//                   {receta.imagenUrl ? (
//                     <img
//                       src={receta.imagenUrl || "/placeholder.svg"}
//                       alt={receta.titulo}
//                       className="h-full w-full object-cover"
//                     />
//                   ) : (
//                     <div className="flex h-full w-full items-center justify-center bg-gray-100">
//                       <span className="text-gray-400">Sin imagen</span>
//                     </div>
//                   )}
//                 </div>
//                 <CardHeader>
//                   <CardTitle className="line-clamp-1">{receta.titulo}</CardTitle>
//                   <CardDescription>Creada: {new Date(receta.fechaCreacion).toLocaleDateString()}</CardDescription>
//                 </CardHeader>
//                 <CardFooter>
//                   <Link href={`/recetas/${receta.id}`} className="w-full">
//                     <Button variant="outline" className="w-full">
//                       Ver Receta
//                     </Button>
//                   </Link>
//                 </CardFooter>
//               </Card>
//             ))}
//           </div>
//         ) : (
//           <Card className="bg-gray-50">
//             <CardContent className="flex flex-col items-center justify-center py-8">
//               <p className="mb-4 text-gray-500">Aún no has creado ninguna receta</p>
//               <Link href="/recetas/crear">
//                 <Button>Crear Mi Primera Receta</Button>
//               </Link>
//             </CardContent>
//           </Card>
//         )}
//         {recetasCreadas.length > 0 && (
//           <div className="mt-4 text-center">
//             <Link href="/home/recipes">
//               <Button variant="link" className="text-teal-600">
//                 Ver todas mis recetas
//               </Button>
//             </Link>
//           </div>
//         )}
//       </div>

//       <div className="mb-8">
//         <h2 className="mb-4 text-2xl font-bold">Tus Favoritos</h2>
//         {recetasFavoritas.length > 0 ? (
//           <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
//             {recetasFavoritas.map((favorito) => (
//               <Card key={favorito.id} className="overflow-hidden">
//                 <div className="aspect-video overflow-hidden">
//                   {favorito.receta.imagenUrl ? (
//                     <img
//                       src={favorito.receta.imagenUrl || "/placeholder.svg"}
//                       alt={favorito.receta.titulo}
//                       className="h-full w-full object-cover"
//                     />
//                   ) : (
//                     <div className="flex h-full w-full items-center justify-center bg-gray-100">
//                       <span className="text-gray-400">Sin imagen</span>
//                     </div>
//                   )}
//                 </div>
//                 <CardHeader>
//                   <CardTitle className="line-clamp-1">{favorito.receta.titulo}</CardTitle>
//                   <CardDescription>Guardada: {new Date(favorito.fechaAgregado).toLocaleDateString()}</CardDescription>
//                 </CardHeader>
//                 <CardFooter>
//                   <Link href={`/recetas/${favorito.receta.id}`} className="w-full">
//                     <Button variant="outline" className="w-full">
//                       Ver Receta
//                     </Button>
//                   </Link>
//                 </CardFooter>
//               </Card>
//             ))}
//           </div>
//         ) : (
//           <Card className="bg-gray-50">
//             <CardContent className="flex flex-col items-center justify-center py-8">
//               <p className="mb-4 text-gray-500">No tienes recetas favoritas</p>
//               <Link href="/recetas">
//                 <Button>Explorar Recetas</Button>
//               </Link>
//             </CardContent>
//           </Card>
//         )}
//         {recetasFavoritas.length > 0 && (
//           <div className="mt-4 text-center">
//             <Link href="/home/favoritos">
//               <Button variant="link" className="text-teal-600">
//                 Ver todos mis favoritos
//               </Button>
//             </Link>
//           </div>
//         )}
//       </div>

//       {/* Sección de Administración (solo para administradores) */}
//       {esAdmin && (
//         <div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
//           <h2 className="mb-4 text-2xl font-bold text-yellow-800">Panel de Administración</h2>
//           <p className="mb-4 text-yellow-700">Tienes acceso a funciones administrativas.</p>
//           <div className="flex flex-wrap gap-3">
//             <Link href="/admin/usuarios">
//               <Button variant="outline" className="border-yellow-600 text-yellow-600 hover:bg-yellow-100">
//                 Gestionar Usuarios
//               </Button>
//             </Link>
//             <Link href="/admin/categorias">
//               <Button variant="outline" className="border-yellow-600 text-yellow-600 hover:bg-yellow-100">
//                 Gestionar Categorías
//               </Button>
//             </Link>
//             <Link href="/admin/dietas">
//               <Button variant="outline" className="border-yellow-600 text-yellow-600 hover:bg-yellow-100">
//                 Gestionar Dietas
//               </Button>
//             </Link>
//             <Link href="/admin/dashboard">
//               <Button className="bg-yellow-600 text-white hover:bg-yellow-700">Dashboard Admin</Button>
//             </Link>
//           </div>
//         </div>
//       )}

//       {/* Sección de Plan de Comidas */}
//       <div className="mb-8">
//         <h2 className="mb-4 text-2xl font-bold">Plan de Comidas</h2>
//         {planesComida.length > 0 ? (
//           <Card>
//             <CardHeader>
//               <CardTitle>{planesComida[0].nombre || "Plan Actual"}</CardTitle>
//               <CardDescription>
//                 {planesComida[0].fechaInicio && planesComida[0].fechaFin ? (
//                   <>
//                     {new Date(planesComida[0].fechaInicio).toLocaleDateString()} -{" "}
//                     {new Date(planesComida[0].fechaFin).toLocaleDateString()}
//                   </>
//                 ) : (
//                   "Plan sin fechas definidas"
//                 )}
//               </CardDescription>
//             </CardHeader>
//             <CardFooter className="flex justify-between">
//               <Link href={`/plan-comidas/${planesComida[0].id}`}>
//                 <Button variant="outline">Ver Plan</Button>
//               </Link>
//               <Link href="/plan-comidas/crear">
//                 <Button>Nuevo Plan</Button>
//               </Link>
//             </CardFooter>
//           </Card>
//         ) : (
//           <Card className="bg-gray-50">
//             <CardContent className="flex flex-col items-center justify-center py-8">
//               <p className="mb-4 text-gray-500">No tienes planes de comida activos</p>
//               <Link href="/plan-comidas/crear">
//                 <Button>Crear Plan de Comidas</Button>
//               </Link>
//             </CardContent>
//           </Card>
//         )}
//       </div>

//       {/* Herramientas y Calculadoras */}
//       <div>
//         <h2 className="mb-4 text-2xl font-bold">Herramientas</h2>
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//           <Link href="/calculadoras/calorias" className="w-full">
//             <Card className="h-full transition-all hover:shadow-md">
//               <CardHeader>
//                 <CardTitle className="text-lg">Calculadora de Calorías</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-sm text-gray-500">Calcula tus necesidades calóricas diarias</p>
//               </CardContent>
//             </Card>
//           </Link>
//           <Link href="/calculadoras/peso-ideal" className="w-full">
//             <Card className="h-full transition-all hover:shadow-md">
//               <CardHeader>
//                 <CardTitle className="text-lg">Peso Ideal</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-sm text-gray-500">Calcula tu peso ideal según tu altura y complexión</p>
//               </CardContent>
//             </Card>
//           </Link>
//           <Link href="/eventos" className="w-full">
//             <Card className="h-full transition-all hover:shadow-md">
//               <CardHeader>
//                 <CardTitle className="text-lg">Eventos Culinarios</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-sm text-gray-500">Descubre eventos y talleres de cocina</p>
//               </CardContent>
//             </Card>
//           </Link>
//           <Link href="/recetas/aleatorias" className="w-full">
//             <Card className="h-full transition-all hover:shadow-md">
//               <CardHeader>
//                 <CardTitle className="text-lg">Receta Aleatoria</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-sm text-gray-500">Descubre nuevas recetas al azar</p>
//               </CardContent>
//             </Card>
//           </Link>
//         </div>
//       </div>
//     </div>
//   )
// }
