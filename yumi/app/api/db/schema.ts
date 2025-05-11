// Este archivo define el esquema de la base de datos usando Drizzle ORM
import { pgTable, uuid, text, timestamp, integer, boolean, numeric, serial, unique, pgEnum, real } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Enums
export const actividadEnum = pgEnum("actividad_diaria", ["sedentario", "ligero", "moderado", "activo", "muy activo"])
export const propositoEnum = pgEnum("proposito", ["mantener", "perder_peso", "ganar_masa", "definir", "otro"])
export const dificultadEnum = pgEnum("dificultad", ["fácil", "media", "difícil"])
export const tipoUnidadEnum = pgEnum("tipo_unidad", ["peso", "volumen", "unidad", "otro"])
export const estadoEventoEnum = pgEnum("estado_evento", ["confirmado", "pendiente", "cancelado"])
export const tipoComidaEnum = pgEnum("tipo_comida", ["desayuno", "almuerzo", "cena", "merienda", "otro"])
export const tipoConsejoEnum = pgEnum("tipo_consejo", ["consejo", "alternativa", "advertencia", "otro"])

// Colores para personalización de la interfaz
export const colores = pgTable("color", {
  id: uuid("id_color").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  codigo: text("código").notNull(),
})

// Usuarios
export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  idClerk: text("id_clerk").notNull().unique(),
  nombre: text("nombre"),
  email: text("email").unique(),
  colorId: uuid("color").references(() => colores.id),
  darkMode: boolean("darkmode").default(false),
  fechaRegistro: timestamp("fecha_registro").defaultNow(),
  urlFotoPerfil: text("url_foto_perfil"),
  ultimaActualizacion: timestamp("ultima_actualizacion").defaultNow(),
})

// Relaciones de usuarios
export const usuariosRelations = relations(usuarios, ({ many, one }) => ({
  metas: many(metasUsuario),
  preferencias: many(preferenciasUsuario),
  dietas: many(dietasUsuario),
  recetas: many(recetas),
  comentarios: many(comentarios),
  puntuaciones: many(puntuaciones),
  favoritos: many(favoritos),
  colecciones: many(colecciones),
  eventos: many(eventos),
  participacionEventos: many(eventosUsuarios),
  intentosRecetas: many(intentosRecetas),
  historialPeso: many(historialPeso),
  planesComidas: many(planComidas),
    color: one(colores, {
    fields: [usuarios.colorId],
    references: [colores.id],
  }),
}))

export const coloresRelations = relations(colores, ({ many }) => ({
  usuarios: many(usuarios),
}))

// Metas de usuario
export const metasUsuario = pgTable("metas_usuario", {
  id: serial("id").primaryKey(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
  altura: numeric("altura"),
  peso: numeric("peso"),
  actividadDiaria: actividadEnum("actividad_diaria"),
  limiteCalorías: integer("limite_calorias"),
  proposito: propositoEnum("proposito"),
  fechaInicio: timestamp("fecha_inicio").defaultNow(),
  fechaActualizacion: timestamp("fecha_actualizacion").defaultNow(),
})

// Historial de peso
export const historialPeso = pgTable("historial_peso", {
  id: serial("id").primaryKey(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
  peso: numeric("peso").notNull(),
  fecha: timestamp("fecha").defaultNow(),
})

// Categorías
export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
})

// Preferencias de usuario
export const preferenciasUsuario = pgTable(
  "preferencias_usuario",
  {
    id: serial("id").primaryKey(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
    categoriaId: integer("categoria_id").references(() => categorias.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      unq: unique().on(table.usuarioId, table.categoriaId),
    }
  },
)

// Dietas
export const dietas = pgTable("dietas", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
  restricciones: text("restricciones"),
})

// Relación usuarios-dietas
export const dietasUsuario = pgTable(
  "dietas_usuario",
  {
    id: serial("id").primaryKey(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
    dietaId: integer("dieta_id").references(() => dietas.id, { onDelete: "cascade" }),
    fechaInicio: timestamp("fecha_inicio").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.usuarioId, table.dietaId),
    }
  },
)

// Recetas
export const recetas = pgTable("recetas", {
  id: serial("id").primaryKey(),
  autorId: uuid("autor_id").references(() => usuarios.id, { onDelete: "set null" }),
  
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  instrucciones: text("instrucciones"),
  tiempoPreparacion: integer("tiempo_preparacion"),
  tiempoCoccion: integer("tiempo_coccion"),
  porciones: integer("porciones"),
  dificultad: dificultadEnum("dificultad"),
  caloriasPorPorcion: integer("calorias_por_porcion"),
  imagenUrl: text("imagen_url"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
  fechaActualizacion: timestamp("fecha_actualizacion").defaultNow(),
  categoriaId: integer("categoria_id").references(()=> categorias.id, {onDelete: "set null"}),
  dietaId: integer("dieta_id").references(() => dietas.id, { onDelete: "set null" }),
})

// Relaciones de recetas
export const recetasRelations = relations(recetas, ({ one, many }) => ({
  autor: one(usuarios, {
    fields: [recetas.autorId],
    references: [usuarios.id],
  }),
  categoria: one(categorias, {
    fields: [recetas.categoriaId],
    references: [categorias.id],
  }),
  dieta: one(dietas, {
    fields: [recetas.dietaId],
    references: [dietas.id],
  }),
  ingredientes: many(ingredientes),
  comentarios: many(comentarios),
  puntuaciones: many(puntuaciones),
  favoritos: many(favoritos),
  etiquetas: many(recetasEtiquetas),
  intentos: many(intentosRecetas),
  infoNutricional: one(infoNutricional),
  consejos: many(consejosRecetas),
}));

//categorias
export const categoriasRelations = relations(categorias, ({ many }) => ({
  recetas: many(recetas),
  preferencias: many(preferenciasUsuario),
}));


// Etiquetas
export const etiquetas = pgTable("etiquetas", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
})

// Relación recetas-etiquetas
export const recetasEtiquetas = pgTable(
  "recetas_etiquetas",
  {
    id: serial("id").primaryKey(),
    recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "cascade" }),
    etiquetaId: integer("etiqueta_id").references(() => etiquetas.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      unq: unique().on(table.recetaId, table.etiquetaId),
    }
  },
)

// Unidades de medida
export const unidadesMedida = pgTable("unidades_medida", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  abreviatura: text("abreviatura"),
  tipo: tipoUnidadEnum("tipo"),
})

// Conversiones entre unidades
export const conversiones = pgTable(
  "conversiones",
  {
    id: serial("id").primaryKey(),
    desdeUnidadId: integer("desde_unidad_id").references(() => unidadesMedida.id),
    haciaUnidadId: integer("hacia_unidad_id").references(() => unidadesMedida.id),
    factorConversion: real("factor_conversion").notNull(),
  },
  (table) => {
    return {
      unq: unique().on(table.desdeUnidadId, table.haciaUnidadId),
    }
  },
)

// Ingredientes
export const ingredientes = pgTable("ingredientes", {
  id: serial("id").primaryKey(),
  recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  cantidad: numeric("cantidad"),
  unidadId: integer("unidad_id").references(() => unidadesMedida.id),
  caloriasPorUnidad: integer("calorias_por_unidad"),
  esOpcional: boolean("es_opcional").default(false),
})

// Información nutricional
export const infoNutricional = pgTable("info_nutricional", {
  id: serial("id").primaryKey(),
  recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "cascade" }),
  proteinas: numeric("proteinas"),
  carbohidratos: numeric("carbohidratos"),
  grasas: numeric("grasas"),
  fibra: numeric("fibra"),
  azucares: numeric("azucares"),
})

// Comentarios
export const comentarios = pgTable("comentarios", {
  id: serial("id").primaryKey(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "cascade" }),
  contenido: text("contenido").notNull(),
  fecha: timestamp("fecha").defaultNow(),
})

// Puntuaciones
export const puntuaciones = pgTable(
  "puntuaciones",
  {
    id: serial("id").primaryKey(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
    recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "cascade" }),
    puntuacion: integer("puntuacion").notNull(),
    fecha: timestamp("fecha").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.usuarioId, table.recetaId),
    }
  },
)

// Favoritos
export const favoritos = pgTable(
  "favoritos",
  {
    id: serial("id").primaryKey(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
    recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "cascade" }),
    fechaAgregado: timestamp("fecha_agregado").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.usuarioId, table.recetaId),
    }
  },
)

// Colecciones
export const colecciones = pgTable("colecciones", {
  id: serial("id").primaryKey(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  esPublica: boolean("es_publica").default(false),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
})

// Relación recetas-colecciones
export const recetasColeccion = pgTable(
  "recetas_coleccion",
  {
    id: serial("id").primaryKey(),
    coleccionId: integer("coleccion_id").references(() => colecciones.id, { onDelete: "cascade" }),
    recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "cascade" }),
    fechaAgregado: timestamp("fecha_agregado").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.coleccionId, table.recetaId),
    }
  },
)

// Eventos
export const eventos = pgTable("eventos", {
  id: serial("id").primaryKey(),
  creadorId: uuid("creador_id").references(() => usuarios.id, { onDelete: "set null" }),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  fechaInicio: timestamp("fecha_inicio").notNull(),
  fechaFin: timestamp("fecha_fin"),
  ubicacion: text("ubicacion"),
  esVirtual: boolean("es_virtual").default(false),
  enlaceVirtual: text("enlace_virtual"),
  imagenUrl: text("imagen_url"),
  esAdmin: boolean("es_admin").default(false),
  capacidadMaxima: integer("capacidad_maxima"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
})

// Participación en eventos
export const eventosUsuarios = pgTable(
  "eventos_usuarios",
  {
    id: serial("id").primaryKey(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
    eventoId: integer("evento_id").references(() => eventos.id, { onDelete: "cascade" }),
    estado: estadoEventoEnum("estado"),
    fechaRegistro: timestamp("fecha_registro").defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.usuarioId, table.eventoId),
    }
  },
)

// Intentos de recetas
export const intentosRecetas = pgTable("intentos_recetas", {
  id: serial("id").primaryKey(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "cascade" }),
  imagenUrl: text("imagen_url").notNull(),
  comentario: text("comentario"),
  fecha: timestamp("fecha").defaultNow(),
})

// Plan de comidas
export const planComidas = pgTable("plan_comidas", {
  id: serial("id").primaryKey(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
  nombre: text("nombre"),
  fechaInicio: timestamp("fecha_inicio", { mode: "date" }),
  fechaFin: timestamp("fecha_fin", { mode: "date" }),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
})

// Detalles del plan de comidas
export const planComidasDetalle = pgTable("plan_comidas_detalle", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").references(() => planComidas.id, { onDelete: "cascade" }),
  recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "set null" }),
  fecha: timestamp("fecha", { mode: "date" }).notNull(),
  tipoComida: tipoComidaEnum("tipo_comida"),
  porciones: integer("porciones").default(1),
})

// Lista de compras
export const listaCompras = pgTable("lista_compras", {
  id: serial("id").primaryKey(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
  planId: integer("plan_id").references(() => planComidas.id, { onDelete: "set null" }),
  nombre: text("nombre"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
  completada: boolean("completada").default(false),
})

// Items de lista de compras
export const listaComprasItems = pgTable("lista_compras_items", {
  id: serial("id").primaryKey(),
  listaId: integer("lista_id").references(() => listaCompras.id, { onDelete: "cascade" }),
  ingrediente: text("ingrediente").notNull(),
  cantidad: numeric("cantidad"),
  unidadId: integer("unidad_id").references(() => unidadesMedida.id),
  comprado: boolean("comprado").default(false),
})

// Consejos para recetas
export const consejosRecetas = pgTable("consejos_recetas", {
  id: serial("id").primaryKey(),
  recetaId: integer("receta_id").references(() => recetas.id, { onDelete: "cascade" }),
  usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  contenido: text("contenido").notNull(),
  tipo: tipoConsejoEnum("tipo"),
  fecha: timestamp("fecha").defaultNow(),
})
