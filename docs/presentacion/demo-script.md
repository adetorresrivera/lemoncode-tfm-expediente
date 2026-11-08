# Guion de la demo — Expediente

La demo dura cinco minutos y se hace sobre los datos de demo. Pegas una sola oferta en directo y recorres el flujo entero: pegar, guardar, ronda, CV, estado y filtrar. Cada paso tiene un plan B (modo simulado) y un plan C (captura o vídeo) por si algo falla.

## Antes de empezar

Decide el proveedor ahora, no en directo. Si algo falla en esta lista, empiezas con el modo simulado y lo dices con naturalidad.

- [ ] La noche anterior, graba el vídeo del plan C siguiendo este guion (mira «Grabar el vídeo»). Guárdalo en tu portátil y en un USB. No lo metas en el repositorio.
- [ ] La mañana de la defensa, y solo si no tienes datos propios que conservar, siembra desde cero con `docker compose exec app npm run seed -- --reset`. Borra todas las candidaturas y todos los documentos, y sus archivos en Silo. Solo lo ejecutas tú, nadie más.
- [ ] Arranca con `docker compose up --build -d` y comprueba que `curl http://localhost:8080/api/health` devuelve `"llm":"ok"`. También sirve `bash scripts/compose-smoke.sh --with-model`.
- [ ] Comprueba que `docker compose exec ollama ollama list` muestra `gemma4:e2b`. Si no aparece, el modelo aún se está descargando.
- [ ] Calienta el modelo con `docker compose exec ollama ollama run gemma4:e2b "hola"`.
- [ ] Haz dos extracciones de calentamiento: «Añadir candidatura», pega `docs/demo/ofertas/onsite-junior.txt`, «Autocompletar con IA», mide el tiempo, sal sin guardar y repite. Si la segunda tarda más de 20 s o algo falla, arranca con `LLM_PROVIDER=mock docker compose up --build -d` y di: «hoy enseño el flujo con el modo simulado».
- [ ] Navegador con zoom al 80–90 %, tema «Claro» en «Tema», ningún filtro activo y la ventana de 1280 px de ancho o más.
- [ ] Ten abierto `docs/demo/ofertas/remote-senior.txt` listo para copiar, junto a las capturas de `capturas/` y el vídeo del plan C.
- [ ] Cronómetro a cero.

## Guion

| # | Tiempo | Paso | Qué dices | Plan B (mock) | Plan C |
| --- | --- | --- | --- | --- | --- |
| 1 | 0:30 | En `/applications`, filtra por «Remoto» y por la etiqueta de stack «React». Salen 3 tarjetas: Tinta y Byte, Olivar Cloud y Cobalto Sistemas. Pulsa «Limpiar filtros». | «Esta es mi búsqueda de empleo. Filtro por remoto y React y me quedo con tres procesos.» | Igual: no depende del modelo. | [Lista en tema Claro](capturas/lista-claro-1280.png) |
| 2 | 0:20 | Pulsa «Añadir candidatura» y luego «Pegar oferta». Pega el contenido de `docs/demo/ofertas/remote-senior.txt` (Nimbo Software, Frontend Senior, remoto) en «Texto de la oferta». | «Pego una oferta tal como la copio de la web. No escribo ni un campo a mano.» | Igual: no depende del modelo. | Vídeo, paso 2. |
| 3 | 0:50 | Pulsa «Autocompletar con IA». Mientras trabaja, cuenta qué pasa por debajo. | «El modelo corre en local, con Ollama, sin salir de mi máquina. Devuelve un JSON y lo valido con el mismo esquema Zod que usa la API.» | La respuesta llega en menos de un segundo y es siempre la misma. Di: «el modo simulado devuelve siempre el mismo borrador de ejemplo; por eso aquí pone Lumen Analytics». | [Formulario con las marcas IA](capturas/formulario-ia-claro-1280.png). La captura es de Ollama y muestra Nimbo Software. |
| 4 | 0:40 | Revisa las marcas «IA» y el aviso «Hemos rellenado …». Corrige un campo: añade «GraphQL» en «Se valora», que el modelo local no suele recoger, o cambia un salario. | «Esto es lo que ha entendido el modelo. Puede fallar, por eso nada se guarda solo; corrijo el campo y la marca IA desaparece.» | Corrige la empresa a «Nimbo Software» y di la misma frase de la marca IA. | [Formulario con las marcas IA](capturas/formulario-ia-claro-1280.png) |
| 5 | 0:20 | Elige «Estado inicial: Enviada» y pulsa «Guardar candidatura». Llegas al detalle con el aviso «Candidatura creada.». | «La guardo como enviada, que es lo que haría justo después de mandar la candidatura.» | Igual: no depende del modelo. | [Detalle de un expediente](capturas/detalle-claro-1280.png). Es una candidatura del seed (Harbor Pine Software): así queda un expediente con rondas, CV e historial. |
| 6 | 0:35 | Pulsa «Añadir ronda», elige un «Tipo» y pulsa «Guardar ronda». El estado pasa a «En entrevistas» sin que lo toques. Señala «Historial de estados»: «En entrevistas», marcado «Actual», sobre «Enviada». Las dos entradas llevan el mismo día, así que enseña el orden. | «No he tocado el estado; la regla la aplica el servicio: pasó de Enviada a En entrevistas al añadir la ronda.» | Igual: no depende del modelo. | [Detalle de un expediente](capturas/detalle-claro-1280.png). Muestra tres rondas y el historial. |
| 7 | 0:35 | Pulsa «Editar», baja a «Documentos», elige «CV Frontend» y guarda. El detalle lista el documento con «Descargar». | «Vinculo el CV que enviaré. El archivo vive en Silo, un almacenamiento local compatible con S3.» | Igual: no depende del modelo. | [Detalle de un expediente](capturas/detalle-claro-1280.png). Muestra los documentos vinculados. |
| 8 | 0:20 | Usa «Cambiar estado» y elige «Oferta recibida». | «Ha llegado la oferta. Cambio el estado y queda en el historial.» | Igual: no depende del modelo. | Vídeo, paso 8. |
| 9 | 0:30 | Vuelve a la lista y filtra solo por el estado «Oferta recibida». Salen 2 tarjetas: la nueva arriba y Mercado Atlas. | «Filtro por ofertas recibidas: la nueva está arriba, junto a Mercado Atlas.» | Igual: no depende del modelo. | Vídeo, paso 9. |
| 10 | 0:20 | Pulsa «Limpiar filtros» y vuelve a las diapositivas. | «Eso es Expediente. Sigo con las diapositivas: qué hay detrás.» | Igual: no depende del modelo. | Vídeo, paso 10. |

Total: 5:00, hablando incluido. El flujo sin hablar dura mucho menos, así que el margen absorbe una extracción lenta.

## Qué verás según el proveedor

El modelo local puede variar entre ejecuciones. Esta tabla describe lo habitual al pegar `remote-senior.txt`.

| Dato | Ollama (`gemma4:e2b`) | Modo simulado (mock) |
| --- | --- | --- |
| Empresa | «Nimbo Software» | «Lumen Analytics» |
| Ubicación | Vacía: la oferta no da ninguna | «Madrid» |
| Tiempo | Tarda unos segundos en CPU | Al instante |
| Etiquetas | React, TypeScript, Vite, Vitest, Testing Library, AWS e «Inglés B2», normalmente sin GraphQL | React, TypeScript, Vite, «Testing Library» e «Inglés B2» |

El modo simulado devuelve el mismo borrador sea cual sea el texto que pegues. Con Ollama, la corrección del paso 4 es añadir «GraphQL». Con el modo simulado, es corregir la empresa.

## Plan B

La decisión se toma en la lista de «Antes de empezar», no en directo. Un reinicio de compose durante la charla no es el camino principal: tarda entre 30 y 60 s.

- Qué cambia en pantalla: el borrador llega al instante y es siempre el mismo, con «Lumen Analytics» y «Madrid». Los pasos 1, 2 y 5 a 10 no cambian.
- Qué dices: «el modo simulado devuelve siempre el mismo borrador de ejemplo; por eso aquí pone Lumen Analytics». En el paso 4 corriges la empresa a «Nimbo Software» y dices la frase de la marca IA.
- Para volver a Ollama: `docker compose up -d` sin la variable. Si dejaste `LLM_PROVIDER=mock` en tu `.env`, quítala antes.

## Plan C

Si un paso falla en directo, di una sola frase («el modelo no responde a tiempo; os enseño el resultado») y sigue con la captura o el vídeo de ese paso. La columna «Plan C» del guion dice cuál usar.

Las cinco capturas están en `capturas/`:

- [Lista en tema Claro, 1280 px](capturas/lista-claro-1280.png)
- [Lista en tema Oscuro, 1280 px](capturas/lista-oscuro-1280.png)
- [Lista en móvil, 360 px](capturas/lista-movil-360.png)
- [Detalle de un expediente](capturas/detalle-claro-1280.png)
- [Formulario con las marcas IA](capturas/formulario-ia-claro-1280.png)

El vídeo lo grabas tú con este guion y lo guardas en tu portátil y en un USB. No se sube al repositorio por su tamaño, y por eso este documento no lo enlaza.

## Grabar el vídeo

Este guion sirve también para grabar el vídeo del plan C.

- Con Ollama ya calentado, tema «Claro» y la ventana a 1280 px.
- Recorre los mismos 10 pasos, con una pausa corta entre ellos para poder cortar por paso.
- Parte de una siembra limpia (`docker compose exec app npm run seed -- --reset`) y no pegues nada que no sea `remote-senior.txt`.
- Guarda el archivo fuera del repositorio: en tu portátil y en un USB.
