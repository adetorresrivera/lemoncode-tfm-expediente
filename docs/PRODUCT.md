# Producto — Expediente

## Problema
Quien busca empleo lleva decenas de procesos a la vez: ofertas guardadas, candidaturas enviadas, varias rondas de entrevistas, distintas versiones de CV y cartas. La información acaba repartida entre correos, notas y hojas de cálculo, y copiar a mano los datos de cada oferta es tedioso.

## Propuesta
Una aplicación web local donde **cada candidatura es un expediente**: datos de la oferta, estado, historial, rondas de entrevista y documentos enviados. El usuario pega la descripción de una oferta y **la IA rellena el formulario y genera las etiquetas**; el usuario revisa y guarda.

## Usuario
Una sola persona en su propio equipo. Sin registro ni login. La app se ejecuta con `docker compose up`.

## Restricciones del TFM (bases de Lemoncode)
- Foco en Front End con el stack del curso (React, TS, Vite, TanStack Router/Form, Zod, Tailwind, arquitectura por pods).
- Uso de herramientas de IA en el desarrollo (GSD + Claude Code) y valor añadido si la IA está en el producto.
- Metodología iterativa: primero un MVP que funcione de principio a fin.
- Entregable: imagen Docker ejecutable en local. Defensa presencial el **9 nov 2026**.

## Alcance

### MVP (fases 1–6)
1. **Listado** de candidaturas con filtros (estado, stack, modalidad, seniority, texto libre) sincronizados con la URL y orden por última actualización o fecha de envío.
2. **Detalle** de candidatura: datos de oferta, etiquetas, estado con selector, historial de estados, rondas de entrevista, documentos vinculados, notas y texto original de la oferta.
3. **Alta y edición** con un único formulario.
4. **Autocompletado con IA**: pegar oferta → borrador de campos y etiquetas agrupadas. Solo rellena campos vacíos; marca «IA» en los rellenados y resalta los que faltan.
5. **Rondas de entrevista**: añadir, editar y borrar rondas (tipo, fecha, modalidad, resultado, notas).
6. **Documentos**: subir CV o carta (PDF/DOCX, ≤5 MB), vincular uno de cada a la candidatura, descargarlos.
7. **Modo oscuro** que sigue al sistema, con toggle.
8. **Seed de demo** y modo IA `mock` como plan B.
9. **Imagen Docker + compose** con todo el sistema.

### Fase 7 — Documentación y defensa
Deck, guion de demo, README final, `docs/ia-en-el-proyecto.md`, `docs/decisiones.md` y preguntas probables del tribunal.

### Iteraciones (si sobra tiempo, en este orden)
1. **Tablero Kanban** con drag & drop accesible entre estados.
2. **Biblioteca de documentos** con versiones y **CV sugerido** por la IA según la oferta.
3. **Timeline y dashboard**: recordatorios de entrevistas y métricas a partir de `statusHistory`.
4. Tests e2e con Playwright.

### Fuera de alcance
Login y multiusuario, landing pública, integraciones con portales de empleo, scraping de URLs, notificaciones por correo, despliegue en la nube.

## Criterios de éxito para la demo
- `docker compose up` arranca todo en una máquina limpia y la app abre en `http://localhost:8080`.
- Flujo completo en menos de 2 minutos: pegar oferta → autocompletar → revisar → guardar → añadir ronda → adjuntar CV → cambiar estado → verlo filtrado en el listado.
- Funciona sin conexión con Ollama local, y con `LLM_PROVIDER=mock` si Ollama falla.
- Responsive desde 360 px y usable solo con teclado.
