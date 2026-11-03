# Diseño — design system «Expediente»

Fuente: design system Expediente (académico y solemne: pergamino, azul Oxford, burdeos, oro viejo). La hoja lista para usar está en `docs/design/expediente.css` → copiar a `apps/web/src/styles.css`. Inicializar shadcn con base color `neutral` y **no** regenerar los tokens.

## Principios
1. Sobriedad: fondos de pergamino, bordes finos, `shadow-sm`. Preferir borde a sombra.
2. El estado manda: color propio por estado, siempre acompañado de texto.
3. Serifa para leer (EB Garamond: títulos y puestos), sans para operar (Source Sans 3: formularios, tablas, botones), mono para cifras y versiones (JetBrains Mono, clase `tabular`).
4. Esquinas casi rectas: `--radius: 0.25rem`. Píldoras solo en avatares y punto de estado.
5. Una sola acción `primary` por vista; el resto `secondary`, `outline` o `ghost`.

## Voz
Tuteo, frases cortas, verbos de acción («Añadir candidatura», «Autocompletar con IA», «Subir documento»). Mayúscula solo inicial. Fechas «12 oct. 2026». Cifras «52.000 €». Sin emojis ni exclamaciones. Estados vacíos con propósito: «Aún no has guardado ninguna oferta. Empieza añadiendo la primera.»

## Componentes clave
- **Badge de estado**: `bg-status-<x>-bg text-status-<x> rounded-sm px-2 py-0.5 text-sm font-semibold` + punto `size-1.5 rounded-full bg-status-<x>` + icono lucide (ver DOMAIN.md).
- **Etiqueta**: `inline-flex h-7 items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 text-[13px] font-semibold`. Variante `soft` (grupo `nice_to_have`): borde discontinuo. Removible en formularios con `aria-label="Quitar <label>"`. Seleccionada como filtro: `bg-primary text-primary-foreground border-primary` + icono `Check`. Nunca colores de estado.
- **Grupos de etiquetas**: título en estilo eyebrow (`text-[11px] uppercase tracking-[0.08em] text-muted-foreground`): Stack tecnológico, Se valora, Modelo de trabajo, Seniority, Contrato, Idiomas. Modalidad, seniority y contrato son campos tipados que se pintan como etiquetas.
- **En listas**: máximo 3 etiquetas + contador `+N`.
- **Marca IA**: `inline-flex h-5 items-center rounded-sm bg-brand-navy px-1.5 text-[11px] font-bold tracking-wide text-brand-parchment` junto al label. Desaparece cuando el usuario edita el campo.
- **Campo que la IA no encontró**: borde `border-brand-gold` + `bg-ai-missing-bg` y ayuda «Complétalo tú».
- **Botón de IA**: `primary` con icono `Sparkles` («Autocompletar con IA»).
- Iconos lucide `strokeWidth={1.5}`, 16 px en controles y 20 px en navegación.

## Pantallas

### Shell (`layouts/app-layout.tsx`)
- Escritorio (≥1024 px): barra lateral fija `bg-sidebar text-sidebar-foreground`, marca «Expediente» en serifa, navegación: «Mis candidaturas» (activa); «Tablero» y «Documentos» desactivadas con «Próximamente». Toggle de tema al pie (Sistema / Claro / Oscuro).
- Móvil: cabecera con botón de menú que abre un `Sheet` con la misma navegación.

### Mis candidaturas (`/applications`)
- Cabecera: eyebrow «Expediente», h1 «Mis candidaturas», contador, botón primary «Añadir candidatura».
- Barra de filtros: búsqueda (título/empresa), multiselección de estado, de stack (de `/api/tags`), modalidad, seniority, orden. Todo en search params; botón «Limpiar filtros».
- Lista de tarjetas (1 columna móvil, tabla densa o 2 columnas en escritorio): puesto (serifa), empresa · ubicación, badge de estado, 3 etiquetas + `+N`, salario, «Actualizada 12 oct. 2026».
- Estados: carga (skeleton), error con reintento, vacío absoluto, vacío por filtros («Ninguna candidatura coincide con los filtros»).

### Detalle (`/applications/$id`)
- Cabecera: puesto (h1), empresa, badge y selector «Cambiar estado», acciones «Editar» y «Eliminar» (diálogo de confirmación).
- Columna principal: Datos de la oferta (dl), Etiquetas agrupadas, Rondas de entrevista (lista ordenada por ronda con tipo, fecha, modalidad, resultado; «Añadir ronda» abre diálogo), Notas, Texto original de la oferta (plegable).
- Columna lateral: Historial de estados (timeline vertical con fechas), Documentos vinculados (descargar).

### Alta / edición (`/applications/new`, `/applications/$id/edit`)
- Panel «Pegar oferta» arriba (abierto en alta, plegado en edición): textarea + botón IA + estado (carga «Analizando la oferta…», error amable sin bloquear el formulario).
- Formulario en secciones: Puesto y empresa · Condiciones (modalidad, seniority, contrato, ubicación, salario min/max, moneda) · Etiquetas (input por grupo con chips removibles) · Seguimiento (estado inicial, fecha de envío, URL, notas) · Documentos (elegir existente o subir: CV y carta).
- Acciones: primary «Guardar candidatura», «Descartar cambios». Validación con el esquema de contracts; errores junto al campo.

## Accesibilidad y responsive
Mobile-first desde 360 px sin scroll horizontal. Labels en todos los campos, foco visible (`ring`), `aria-live="polite"` en carga/errores/resultado de IA, contraste AA (los tokens ya lo cumplen; `brand-gold` nunca como texto pequeño, usar `brand-gold-ink`). Todo operable con teclado; diálogos de shadcn con foco atrapado.
