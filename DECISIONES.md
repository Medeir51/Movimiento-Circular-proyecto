# Decisiones de desarrollo

Registro de las decisiones tomadas donde la especificación (versión 2.0) no era explícita o había que elegir entre dos lecturas. Formato: fecha · sección · decisión · motivo.

| Fecha | Sección | Decisión | Motivo |
|---|---|---|---|
| 2026-11-07 | 4 | Vite 8, Vitest 5, ESLint 10, `@vitejs/plugin-react` 6, `vite-plugin-pwa` 2, React 18.3 y TypeScript 6.0. | Versiones estables vigentes. TypeScript 7 no es compatible todavía con `typescript-eslint`; React se mantiene en 18 como pide la especificación. |
| 2026-11-07 | 4 | `index.html` toma el título, la descripción y el texto de `<noscript>` de `src/i18n/es.ts` con un pequeño plugin de Vite. | Mantener todos los textos en un solo archivo (sección 24). |
| 2026-11-07 | 4 | Los íconos PNG de la PWA se generan con `scripts/generate-icons.mjs`, sin herramientas externas. | Sin dependencias ni descargas adicionales. |
| 2026-11-07 | 5.2 | Además de `AppState`, el store guarda la pestaña activa, la subpestaña de aplicaciones, el caso activo, los datos de las aplicaciones y los avisos. Los resultados nunca se guardan: se derivan con selectores memoizados. | La interfaz necesita ese estado; la especificación pide un único store. |
| 2026-11-07 | 5.2 | Las transiciones del estado del simulador (política de radio, regla de 3 datos, alfileres, cambio de modo y de unidad) son funciones puras en `src/core/edits.ts`. | Quedan probadas junto con el núcleo (M2, M3, M11, V15…). |
| 2026-11-07 | 7 | Identificadores de unidad únicos: `gram` (gramo) frente a `g` (gravedades), `rev/min` para el campo rpm del MCU (sin conversión) frente a `rpm` como unidad de ω, `rev/s` (se muestra «Hz (rev/s)») y `turns` para contar vueltas. | Los símbolos «g», «rpm» y «Hz» se repiten entre magnitudes distintas. `toSI(120, 'rpm')` y `toSI(1, 'g')` dan lo que piden P10 y P11. |
| 2026-11-07 | 7 | Al cambiar la unidad de un dato, el número se reescribe con 15 cifras significativas (por ejemplo, 2,54 en vez de 2,5399999999999996). | Se conserva la precisión del double sin mostrar ruido de redondeo binario. |
| 2026-11-07 | 8.1 | `parseNumber` también acepta superíndices (`10⁻⁶`), espacios alrededor de `×`, `10^3` solo y el signo menos tipográfico. | Para que cualquier número formateado por la app se pueda copiar y volver a pegar (8.4). |
| 2026-11-07 | 8.2 | Un texto inválido también se guarda en el store; el núcleo marca el error en el campo y la interfaz muestra el último resultado válido atenuado. | El store guarda «el texto tal como lo escribió el usuario» (5.2). |
| 2026-11-07 | 8.2 | Esc restaura todo el estado del simulador que había al entrar al campo, no solo su texto. | Escribir en un campo calculado cambia la fuente del grupo; deshacer solo el texto dejaría la fuente cambiada. |
| 2026-11-07 | 8.4 | Los negativos usan el guion ASCII («-»). | Se puede pegar en hojas de cálculo. |
| 2026-11-07 | 8.4 / 16 | La tabla 16 escribe la a_c de la Luna como «2,723 × 10⁻³», pero la regla 8.4 exige notación decimal para 10⁻³ ≤ \|x\| < 10⁶; la app muestra «0,002723». | Se sigue la regla de formato, que es la normativa. |
| 2026-11-07 | 9.1 | r y d se muestran uno debajo del otro; el selector de unidad está en r y d muestra la misma unidad. | En la columna de 320 px no caben dos campos con selector lado a lado; coincide con el esquema de 19.2. |
| 2026-11-07 | 9.1 | θ0 vacío se toma como 0. Δθ y s deben ser ≥ 0 en el MCU (E-RANGE-NEG). | El sentido lo da el selector; las magnitudes que escribe el usuario son positivas (sección 6). |
| 2026-11-07 | 9.2 / 9.5 | Si el punto pasa al eje y la fuente del panel D era s, la fuente pasa a Δθ con su valor actual. | Mismo criterio que la conversión de v, a_c y F_c a ω. |
| 2026-11-07 | 9.4 | Con «mantener v», si el punto estaba en el eje (v = 0) se conserva ω. | Conservar v = 0 detendría la rueda. |
| 2026-11-07 | 10.1 | Al pasar de MCUV a MCU, si ω(τ) es negativa la rueda queda girando al revés: se invierte el selector de sentido y ω = \|ω(τ)\|. Cambiar de modo borra la referencia. | Las rapideces del MCU son siempre positivas; las filas de la comparación cambian de un modo a otro. |
| 2026-11-07 | 10.2 | Borrar el texto de un dato lo saca de la lista (y le quita el alfiler). El alfiler en un campo calculado lo convierte en dato con su valor actual; está deshabilitado si el campo no tiene valor. | Coherente con «borrar el campo fuente deja su grupo sin datos» y con «con un clic se fija como dato». |
| 2026-11-07 | 10.3 | Combinación 8 con α = 0: ω0 = ω_f (no +√ω_f²). Combinación 5 con discriminante negativo y α > 0: E-MCUV-NEVER. | Con α = 0 la raíz positiva contradice ω_f = ω0 + αt si ω_f < 0; «la rueda se detiene antes…» solo tiene sentido al frenar. |
| 2026-11-07 | 11 | Los pasos de conversión van primero; la línea de texto plano no incluye el valor en la unidad elegida por el usuario (se muestra aparte en la interfaz). | Coincide exactamente con el ejemplo 11.3 (prueba automática). |
| 2026-11-07 | 12.2 | Las flechas usan exactamente los colores de 12.3; el texto de sus etiquetas usa un tono más oscuro (más claro en el tema oscuro) del mismo color. | Contraste AA de los textos (19.9). |
| 2026-11-07 | 12.2 | La etiqueta del ángulo muestra las vueltas completas con signo: «+» antihorario y «−» horario. | Convención matemática de la sección 6. |
| 2026-11-07 | 12.5 | La animación se pausa al ocultarse la pestaña y continúa al volver si estaba reproduciéndose. En MCU el deslizador muestra τ módulo su dominio. | La pausa evita saltos; en MCU τ no tiene límite. |
| 2026-11-07 | 13 | θ(t) grafica θ − θ0 medido en el sentido de giro elegido. | Así su pendiente es ω (positiva), como dice la nota de la gráfica. |
| 2026-11-07 | 13 | Cuadrícula 2 × 2 desde 1280 px de ancho; entre 768 y 1279 px las gráficas van en una columna (o 2 × 2 en tableta, donde la columna es más ancha). | En la columna central de escritorio de 1024 px cada gráfica quedaría de ~140 px. |
| 2026-11-07 | 14 | La frase resumen usa símbolos (ω, T, f…) y omite los datos que el usuario cambió de la lista «sin cambio». Cargar un caso o cambiar de modo borra la referencia. | Reproduce el ejemplo de la especificación. |
| 2026-11-07 | 15 | Las fórmulas en KaTeX viven en `es.ts` (contienen palabras como «vuelta»). «Probar con los datos actuales» usa, en MCUV, los valores finales; las fórmulas F22–F28 usan los datos de la pestaña Aplicaciones. | Textos centralizados; ω, v y a_c no son únicas en el MCUV. |
| 2026-11-07 | 16 | El caso Frenado no trae masa (la tabla no la da): las fuerzas muestran «—». El periodo de la Luna se guarda en días (27,321661 d). | Se cargan exactamente los datos de la tabla. |
| 2026-11-07 | 17.2 | Con μ_s = 0 se muestran v_max = v_min = v_ideal (F24 con μ = 0). μ_s vacío se toma como 0. | Es lo que da la fórmula y lo que pide «0 = sin fricción». |
| 2026-11-07 | 17.3 | La órbita inicial es la de la EEI (h = 420 km, m = 420 t). | Atajo de la propia especificación. |
| 2026-11-07 | 18.1 | El código del taller se compara sin espacios externos y sin distinguir mayúsculas. La práctica libre usa un código aleatorio «LIBRE-…». | Evita que un error de tipeo cambie todos los datos del estudiante. |
| 2026-11-07 | 18.2 | E4: r1 y r2 en centímetros enteros; E3 y E5: N y t enteros. E10: la pregunta «en g» es una aceleración con la unidad g preseleccionada. | Pasos «de libro»; permite detectar el error del factor g. |
| 2026-11-07 | 18.3 | «Respondiste bien X de N preguntas» aparece cuando todas las preguntas se comprobaron al menos una vez. | La especificación no define cuándo «termina» un ejercicio. |
| 2026-11-07 | 19.1 | Entre 768 y 1140 px el nombre de la app se oculta visualmente (sigue para lectores de pantalla). | Para que quepan las cinco pestañas. |
| 2026-11-07 | 19.3 | En el celular, las pestañas internas van pegadas debajo del lienzo fijo. | Si no, quedan tapadas por el lienzo al desplazarse. |
| 2026-11-07 | 19.6 | «Unidades al iniciar» se aplica a los campos nuevos al reiniciar o al cargar un caso (los datos del caso conservan sus unidades). | Cambiar las unidades de los datos actuales sorprendería al usuario. |
| 2026-11-07 | 19.7 | No se guarda τ ni si la animación estaba reproduciéndose. | Al abrir la app, la animación empieza de nuevo (o en pausa con `prefers-reduced-motion`). |
| 2026-11-07 | 19.8 | Al cargar un enlace compartido se quita `#s=…` de la dirección. | Si no, al recargar se volvería a aplicar el enlace sobre los cambios del usuario. |
| 2026-11-07 | 21 | KaTeX y las pestañas Fórmulas, Aplicaciones, Ejercicios y Ayuda se cargan con importación dinámica; todos esos archivos quedan en la precarga del service worker. | El JavaScript inicial bajó de ~197 KB a ~110 KB (gzip). Lighthouse 12 (emulación móvil): Rendimiento 92–96, Accesibilidad 100, Buenas prácticas 100, SEO 100. |
| 2026-11-07 | 21 | Lighthouse 12 ya no tiene categoría PWA; la instalabilidad se cubre con el manifiesto, los íconos 192/512 (y uno adaptable) y la prueba U8 sin conexión. | Cambio de la herramienta, no de la app. |
| 2026-11-07 | 22.7 | Playwright usa su Chromium por defecto; con `PW_CHANNEL=msedge` usa el Edge instalado (así se ejecutaron aquí). | Evita descargar un navegador cuando ya hay uno. |
