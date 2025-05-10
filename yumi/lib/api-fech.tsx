// ------------------------- Archivo por revisar-------------------------
type Pagination = {
  page?: number;
  limit?: number;
};

type RecetaFiltros = {
  titulo?: string;
  categoria?: number;
  dieta?: number;
  autor?: string;
  ordenar?: 'fecha_desc' | 'calorias_asc' | 'puntuacion_desc';
};

// Función base para hacer peticiones
async function fetchAPI<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `/api${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Error en la petición');
  }
  
  return data;
}

// ==================== USUARIOS ====================

// Obtener perfil del usuario actual
export async function obtenerPerfilUsuario() {
  return fetchAPI('/auth', { method: 'GET' });
}

// Actualizar perfil de usuario
export async function actualizarPerfilUsuario(datos: {
  nombre?: string;
  altura?: number;
  peso?: number;
  actividadDiaria?: string;
  proposito?: string;
}) {
  return fetchAPI('/auth', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// Obtener historial de peso
export async function obtenerHistorialPeso() {
  return fetchAPI('/usuarios/historial-peso', { method: 'GET' });
}

// Registrar nuevo peso
export async function registrarPeso(peso: number) {
  return fetchAPI('/usuarios/historial-peso', {
    method: 'POST',
    body: JSON.stringify({ peso }),
  });
}

// ==================== RECETAS ====================

// Obtener lista de recetas con filtros y paginación
export async function obtenerRecetas(
  filtros: RecetaFiltros = {}, 
  paginacion: Pagination = { page: 1, limit: 10 }
) {
  const params = new URLSearchParams();
  
  // Añadir parámetros de paginación
  if (paginacion.page) params.append('page', paginacion.page.toString());
  if (paginacion.limit) params.append('limit', paginacion.limit.toString());
  
  // Añadir filtros
  if (filtros.titulo) params.append('titulo', filtros.titulo);
  if (filtros.categoria) params.append('categoria', filtros.categoria.toString());
  if (filtros.dieta) params.append('dieta', filtros.dieta.toString());
  if (filtros.autor) params.append('autor', filtros.autor);
  if (filtros.ordenar) params.append('ordenar', filtros.ordenar);
  
  return fetchAPI(`/recetas?${params.toString()}`);
}

// Obtener una receta específica
export async function obtenerReceta(id: number) {
  return fetchAPI(`/recetas/${id}`);
}

// Crear una nueva receta
export async function crearReceta(datos: {
  titulo: string;
  descripcion?: string;
  instrucciones: string;
  tiempoPreparacion?: number;
  tiempoCoccion?: number;
  porciones?: number;
  dificultad?: string;
  caloriasPorPorcion?: number;
  imagenUrl?: string;
  dietaId?: number;
  ingredientes?: Array<{
    nombre: string;
    cantidad: number;
    unidadId: number;
    caloriasPorUnidad?: number;
    esOpcional?: boolean;
  }>;
}) {
  return fetchAPI('/recetas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// Actualizar una receta
export async function actualizarReceta(
  id: number,
  datos: Partial<{
    titulo: string;
    descripcion: string;
    instrucciones: string;
    tiempoPreparacion: number;
    tiempoCoccion: number;
    porciones: number;
    dificultad: string;
    caloriasPorPorcion: number;
    imagenUrl: string;
    dietaId: number;
  }>
) {
  return fetchAPI(`/recetas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
}

// Eliminar una receta
export async function eliminarReceta(id: number) {
  return fetchAPI(`/recetas/${id}`, { method: 'DELETE' });
}

// Obtener recetas aleatorias
export async function obtenerRecetasAleatorias(cantidad: number = 3) {
  return fetchAPI(`/recetas/aleatorias?cantidad=${cantidad}`);
}

// Marcar/desmarcar receta como favorita
export async function toggleFavoritoReceta(id: number) {
  return fetchAPI(`/recetas/${id}/favorito`, { method: 'PUT' });
}

// Añadir comentario a receta
export async function comentarReceta(id: number, contenido: string) {
  return fetchAPI(`/recetas/${id}/comentarios`, {
    method: 'POST',
    body: JSON.stringify({ contenido }),
  });
}

// Puntuar receta
export async function puntuarReceta(id: number, puntuacion: number) {
  return fetchAPI(`/recetas/${id}/puntuaciones`, {
    method: 'POST',
    body: JSON.stringify({ puntuacion }),
  });
}

// ==================== CATEGORÍAS ====================

// Obtener todas las categorías
export async function obtenerCategorias() {
  return fetchAPI('/categorias');
}

// ==================== DIETAS ====================

// Obtener todas las dietas
export async function obtenerDietas() {
  return fetchAPI('/dietas');
}

// Actualizar dietas del usuario
export async function actualizarDietasUsuario(dietasIds: number[]) {
  return fetchAPI('/usuarios/dietas', {
    method: 'PUT',
    body: JSON.stringify({ dietas: dietasIds }),
  });
}

// ==================== COLECCIONES ====================

// Obtener colecciones del usuario
export async function obtenerColeccionesUsuario() {
  return fetchAPI('/colecciones');
}

// Crear nueva colección
export async function crearColeccion(datos: {
  nombre: string;
  descripcion?: string;
  esPublica?: boolean;
}) {
  return fetchAPI('/colecciones', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// Añadir receta a colección
export async function añadirRecetaAColeccion(coleccionId: number, recetaId: number) {
  return fetchAPI(`/colecciones/${coleccionId}/recetas`, {
    method: 'POST',
    body: JSON.stringify({ recetaId }),
  });
}

// Eliminar receta de colección
export async function eliminarRecetaDeColeccion(coleccionId: number, recetaId: number) {
  return fetchAPI(`/colecciones/${coleccionId}/recetas/${recetaId}`, {
    method: 'DELETE',
  });
}

// ==================== EVENTOS ====================

// Obtener eventos próximos
export async function obtenerEventosProximos() {
  return fetchAPI('/eventos/proximos');
}

// Crear nuevo evento
export async function crearEvento(datos: {
  titulo: string;
  descripcion?: string;
  fechaInicio: Date;
  fechaFin?: Date;
  ubicacion?: string;
  esVirtual?: boolean;
  enlaceVirtual?: string;
  imagenUrl?: string;
  capacidadMaxima?: number;
}) {
  return fetchAPI('/eventos', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// Registrarse en un evento
export async function registrarseEnEvento(eventoId: number) {
  return fetchAPI(`/eventos/${eventoId}/participantes`, {
    method: 'POST',
  });
}

// Cancelar registro en evento
export async function cancelarRegistroEvento(eventoId: number) {
  return fetchAPI(`/eventos/${eventoId}/participantes`, {
    method: 'DELETE',
  });
}

// ==================== PLAN DE COMIDAS ====================

// Obtener planes de comidas del usuario
export async function obtenerPlanesComidas() {
  return fetchAPI('/plan-comidas');
}

// Crear nuevo plan de comidas
export async function crearPlanComidas(datos: {
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
}) {
  return fetchAPI('/plan-comidas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// Añadir receta a plan de comidas
export async function añadirRecetaAPlan(
  planId: number,
  datos: {
    recetaId: number;
    fecha: Date;
    tipoComida: 'desayuno' | 'almuerzo' | 'cena' | 'merienda' | 'otro';
    porciones?: number;
  }
) {
  return fetchAPI(`/plan-comidas/${planId}/detalle`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// Generar lista de compras desde plan
export async function generarListaCompras(planId: number, nombre?: string) {
  return fetchAPI('/plan-comidas/generar-lista-compras', {
    method: 'POST',
    body: JSON.stringify({ planId, nombre }),
  });
}

// ==================== CALCULADORAS ====================

// Calcular calorías de receta o ingredientes
export async function calcularCalorias(datos: {
  recetaId?: number;
  ingredientes?: Array<{
    nombre: string;
    cantidad: number;
    caloriasPorUnidad: number;
  }>;
  porciones?: number;
}) {
  return fetchAPI('/calculadoras/calorias', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// Calcular peso ideal
export async function calcularPesoIdeal(datos: {
  altura: number;
  genero: 'masculino' | 'femenino';
  estructuraOsea?: 'pequeña' | 'media' | 'grande';
  edad?: number;
}) {
  return fetchAPI('/calculadoras/peso-ideal', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// Convertir unidades
export async function convertirUnidades(datos: {
  cantidad: number;
  desdeUnidadId: number;
  haciaUnidadId: number;
}) {
  return fetchAPI('/calculadoras/conversion-unidades', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// ==================== SUBIDA DE ARCHIVOS ====================

// Subir imagen a Cloudinary
export async function subirImagen(archivo: File) {
  const formData = new FormData();
  formData.append('imagen', archivo);
  
  return fetch('/api/upload/imagen', {
    method: 'POST',
    body: formData,
  }).then(response => {
    if (!response.ok) {
      throw new Error('Error al subir imagen');
    }
    return response.json();
  });
}