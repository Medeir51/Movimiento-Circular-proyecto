---
title: "App de movimiento circular"
subtitle: "Especificación completa para desarrollo (versión 2.0)"
lang: es-CO
---

# 0. Instrucciones para Claude Code

Este documento es la **única fuente de verdad** para construir la aplicación. Todas las decisiones de diseño, física, interfaz y tecnología están tomadas aquí. Sigue estas reglas:

1. **Implementa todo lo que dice el documento.** Ninguna sección es opcional salvo que diga explícitamente "opcional".
2. **Trabaja por fases** (sección 23). Al terminar cada fase, ejecuta `npm run test` y `npm run build`. No pases a la siguiente fase con pruebas fallando.
3. **La física va primero y va aislada.** Los módulos de `src/core/` son funciones puras de TypeScript, sin React, sin acceso al DOM y sin estado global. Se prueban con los casos de la sección 22 **antes** de construir la interfaz.
4. **Idioma:** toda la interfaz en español de Colombia. Los nombres de variables, funciones y archivos en inglés. Todos los textos visibles se centralizan en `src/i18n/es.ts`; no escribas textos de interfaz directamente en los componentes.
5. **Sin servidor:** no hay backend, cuentas, inicio de sesión, analítica ni llamadas de red en tiempo de ejecución. Todo funciona sin conexión una vez cargada.
6. **Si algo no está especificado,** elige la opción más simple coherente con este documento y regístrala en `DECISIONES.md` (fecha, sección, decisión, motivo). No detengas el trabajo para preguntar.
7. **Precisión numérica:** se calcula siempre con `number` de doble precisión y en unidades del SI. Se redondea **solo al mostrar**. Nunca se usa un valor redondeado para calcular otro.
8. **Definición de terminado:** la lista de la sección 24 completa, todas las pruebas de la sección 22 pasando y la app funcionando sin conexión.

# 1. El problema

El movimiento circular es uno de los temas donde más se confunden los estudiantes de Física 1. Aparecen muchas magnitudes que se parecen entre sí (velocidad lineal y angular, aceleración centrípeta y tangencial, periodo y frecuencia), se usan unidades distintas (rpm, rad/s, m/s) y las fórmulas se memorizan sin entender qué significa cada letra.

En un cuaderno, cambiar un solo dato obliga a rehacer todo el cálculo. Eso desmotiva la exploración y casi nunca se compara qué ocurre si el radio se duplica o si la rueda gira más rápido.

# 2. Por qué sería útil

- **Relaciona fórmula con fenómeno.** Al mover un valor, el estudiante ve cómo cambian las demás magnitudes y la rueda animada. La fórmula deja de ser abstracta.
- **Aprendizaje por exploración.** Preguntas como «¿qué pasa con la aceleración si duplico el radio?» se responden en segundos, no en minutos de cálculo.
- **Verifica tareas y ejercicios.** El estudiante resuelve a mano y comprueba su resultado. Si no coincide, revisa el procedimiento, no solo la respuesta.
- **Maneja las unidades.** Convierte entre rpm, rad/s y Hz, y entre mm, cm, m, km y pulgadas. Reduce el error más común en exámenes.
- **Casos reales.** Ruedas de bicicleta o carro, discos, ventiladores, lavadoras, curvas en carretera, satélites y la Tierra misma.
- **Apoyo para el docente.** Sirve para demostraciones en clase, para generar ejercicios con datos distintos por estudiante y para repasar antes de evaluaciones.

# 3. Resumen de funciones y alcance

## 3.1 Módulos obligatorios

| Módulo | Qué hace | Sección |
|---|---|---|
| Simulador MCU | Movimiento circular uniforme (α = 0). El usuario ingresa lo que conoce y la app calcula el resto. | 9 |
| Simulador MCUV | Movimiento circular con aceleración angular constante (arranque, frenado). Resuelve con 3 datos de 5. | 10 |
| Paso a paso | Muestra cada fórmula usada, la sustitución con valores y unidades y el resultado. | 11 |
| Animación | Rueda que gira según los datos, con vectores v, a_c, a_t y a, punto marcado, trayectoria y ángulo. | 12 |
| Gráficas | θ(t), ω(t), v(t), a_c(t) y a_t(t) con cursor sincronizado con la animación. | 13 |
| Comparar con referencia | Congela un estado y muestra cuánto cambió cada magnitud (×2, ×0,5…). | 14 |
| Apartado de fórmulas | Cada fórmula con su significado, símbolos, unidades, cuándo usarla y error común. Resaltado interactivo. | 15 |
| Casos predefinidos | Bicicleta, vinilo, ventilador, carro, lavadora, Luna, Tierra (ecuador y Bogotá), Estación Espacial. | 16 |
| Aplicaciones | Curva plana con fricción, curva peraltada y órbitas circulares. | 17 |
| Ejercicios y modo docente | Generador de ejercicios con datos distintos por estudiante, verificación de respuestas, detección de errores típicos y talleres imprimibles con clave. | 18 |
| Ajustes, guardado y compartir | Valor de g, cifras significativas, tema, guardado automático y enlace para compartir una configuración. | 19.6–19.8 |

## 3.2 Fuera de alcance

Cuentas de usuario, almacenamiento en la nube, movimiento no circular (elíptico, proyectil), efectos relativistas, rodadura con deslizamiento, momento de inercia y torque (podrían ser una versión futura).

# 4. Plataforma y tecnología

| Aspecto | Decisión |
|---|---|
| Tipo de app | Aplicación web de una sola página (SPA), instalable como **PWA** y usable **sin conexión**. Funciona en computador, tableta y celular desde el navegador. |
| Lenguaje | TypeScript en modo `strict`. |
| Framework | React 18 + Vite. |
| Estado global | Zustand (un único store, sección 5.2). |
| Animación | Canvas 2D con `requestAnimationFrame`. |
| Gráficas | Componente propio en SVG (sin librerías de gráficas). |
| Fórmulas | KaTeX, empaquetado localmente (no CDN). |
| Estilos | CSS Modules con variables CSS para el tema claro y oscuro. Sin frameworks de CSS. |
| Pruebas | Vitest (unitarias) y Playwright (extremo a extremo). |
| PWA | `vite-plugin-pwa` con precarga de todos los recursos. |
| Calidad | ESLint + Prettier. `npm run lint` sin errores. |
| Navegadores | Las 2 últimas versiones de Chrome, Edge, Firefox y Safari; Chrome Android en equipos de gama media. |
| Ancho mínimo | 360 px. |
| Despliegue | Archivos estáticos (`npm run build` → `dist/`), publicables en GitHub Pages, Netlify o cualquier servidor estático. |

Scripts obligatorios en `package.json`: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`.

# 5. Arquitectura

## 5.1 Estructura de carpetas

```
src/
  core/                 # Lógica pura, sin React. 100 % probada.
    units.ts            # Unidades, factores y conversión (sección 7)
    numberFormat.ts     # Lectura y formato de números (sección 8)
    constants.ts        # g, G, cuerpos celestes
    mcu.ts              # Motor MCU (sección 9)
    mcuv.ts             # Motor MCUV (sección 10)
    kinematics.ts       # Valores instantáneos en el tiempo τ (sección 10.4)
    steps.ts            # Construcción del paso a paso (sección 11)
    timeScale.ts        # Escala de tiempo de la animación (sección 12.4)
    applications/
      flatCurve.ts      # Curva plana (17.1)
      bankedCurve.ts    # Curva peraltada (17.2)
      orbit.ts          # Órbitas (17.3)
    exercises/
      prng.ts           # Generador pseudoaleatorio con semilla
      templates.ts      # Plantillas de ejercicios (sección 18)
      checker.ts        # Verificación de respuestas y errores típicos
    messages.ts         # Códigos de error y advertencia (sección 20)
  data/
    formulas.ts         # Fórmulas y símbolos (sección 15)
    presets.ts          # Casos predefinidos (sección 16)
  store/
    useAppStore.ts      # Store de Zustand
    persistence.ts      # localStorage y enlace compartible
  components/
    layout/             # Encabezado, pestañas, contenedores
    inputs/             # QuantityInput, UnitSelect, PointSelector, etc.
    simulator/          # Paneles A–D, resultados, comparación
    canvas/             # WheelCanvas y dibujo por estilos
    charts/             # LineChart en SVG
    steps/              # Panel paso a paso
    formulas/           # Tarjetas de fórmulas y glosario
    applications/       # Pantallas de aplicaciones
    exercises/          # Práctica, modo docente, impresión
  i18n/es.ts            # Todos los textos de la interfaz
  styles/               # Variables, tema, impresión
tests/
  core/                 # Pruebas unitarias (sección 22)
  e2e/                  # Pruebas Playwright
```

## 5.2 Modelo de estado

Los campos guardan **el texto tal como lo escribió el usuario y su unidad**. El motor de cálculo lee el estado y devuelve resultados; los resultados **no** se guardan en el store, se derivan con un selector memoizado.

```ts
type UnitId = string;                       // p. ej. 'cm', 'rpm', 'km/h'
interface Quantity { text: string; unit: UnitId }

type Mode = 'MCU' | 'MCUV';
type Direction = 'ccw' | 'cw';              // antihorario | horario
type PointKind = 'rim' | 'half' | 'axis' | 'custom';
type WheelStyle = 'wheel' | 'disc' | 'fan' | 'orbit' | 'planet';

type RateField = 'rpm' | 'f' | 'T' | 'omega' | 'v' | 'ac' | 'Fc';
type TimeField = 't' | 'dtheta' | 's';
type KinVar = 'omega0' | 'omegaF' | 'alpha' | 't' | 'dtheta';

interface AppState {
  mode: Mode;
  geometry: {
    radius: Quantity;                       // radio de la rueda R
    radiusEditedAs: 'r' | 'd';              // el usuario escribió radio o diámetro
    point: { kind: PointKind; custom: Quantity }; // custom: longitud o '%'
    theta0: Quantity;                       // ángulo inicial del punto (° por defecto)
    direction: Direction;
    style: WheelStyle;
  };
  mass: Quantity;
  mcu: {
    rateSource: RateField | null;           // último campo de rapidez editado
    rate: Record<RateField, Quantity>;
    timeSource: TimeField | null;
    time: Record<TimeField, Quantity>;
    radiusPolicy: 'keepOmega' | 'keepV';    // sección 9.4
  };
  mcuv: {
    fields: Record<KinVar | 'at' | 's', Quantity>;
    knowns: KinVar[];                       // datos, máximo 3, en orden de edición
    pinned: KinVar[];                       // datos fijados con el alfiler
    alphaEnteredAs: 'alpha' | 'at';
    dthetaEnteredAs: 'dtheta' | 's';
  };
  reference: ReferenceSnapshot | null;      // sección 14
  playback: { playing: boolean; tau: number; loop: boolean; timeScaleOverride: number | null };
  display: {
    showV: boolean; showAc: boolean; showAt: boolean; showA: boolean;
    showTrail: boolean; showAngle: boolean; showAxes: boolean; lockVectorScale: boolean;
  };
  settings: Settings;                       // sección 19.6
}
```

Funciones principales del núcleo (firmas obligatorias):

```ts
solveMCU(state: AppState, s: Settings): SolveResult
solveMCUV(state: AppState, s: Settings): SolveResult
instant(result: SolveResult, tau: number): InstantValues   // valores en el instante τ
buildSteps(state: AppState, result: SolveResult): Step[]
autoTimeScale(fMaxRevPerSec: number, durationSec?: number): number

interface SolveResult {
  ok: boolean;
  si: Partial<Record<VarId, number>>;      // todos los valores en SI
  fieldStatus: Record<string, 'input' | 'computed' | 'empty' | 'error' | 'disabled'>;
  errors: Message[];                        // impiden calcular (sección 20)
  warnings: Message[];                      // se calcula, pero se avisa
  steps: Step[];
}
```

# 6. Convenciones físicas y de signos

1. **Unidades internas:** SI siempre (m, s, kg, rad, N).
2. **Ángulos:** en el núcleo se usan radianes; θ = 0 apunta hacia la derecha (eje +x) y los ángulos positivos van en sentido **antihorario** (convención matemática).
3. **Sentido de giro:** el usuario elige *Antihorario* (predeterminado) u *Horario*. Las magnitudes de rapidez que escribe (rpm, f, ω, v…) son **siempre positivas**; el sentido lo da el selector. Internamente `ω_con_signo = +|ω|` si es antihorario y `−|ω|` si es horario.
4. **Aceleración angular α (MCUV):** el usuario la escribe **con signo relativo al sentido de giro elegido**: positiva = la rueda acelera; negativa = la rueda frena. Lo mismo para ω_f: si resulta negativa, la rueda terminó girando al revés.
5. **Canvas:** el eje y del canvas apunta hacia abajo. Al dibujar se usa `y_canvas = cy − y_física`. Nunca se mezclan convenciones dentro del núcleo.
6. **Punto de interés:** R es el radio de la rueda; r_p es la distancia del punto analizado al centro (0 ≤ r_p ≤ R). **v, s, a_c, a_t, a y F se calculan en r_p.** Por defecto el punto está en el borde (r_p = R).
7. **Masa:** la masa m es la del objeto ubicado en el punto de interés (una válvula, una moneda, la ropa, un satélite). La masa nunca cambia el movimiento; solo afecta las fuerzas.
8. **g:** valor global configurable (sección 19.6), por defecto **9,8 m/s²**. Se usa en las aplicaciones y en la unidad "g" de aceleración.
9. **Constantes:** G = 6,6743 × 10⁻¹¹ N·m²/kg². Cuerpos celestes en la sección 17.3.

# 7. Unidades y conversiones

Cada campo tiene un selector de unidad. **El valor calculado de un campo se muestra en la unidad seleccionada en ese campo.** Al pasar el cursor (o mantener presionado en celular) sobre un valor, aparece su equivalente en SI.

| Magnitud | Unidades disponibles (factor a SI) | Unidad por defecto |
|---|---|---|
| Longitud (R, d, r_p, s, h) | mm (0,001) · cm (0,01) · m (1) · km (1000) · in, pulgada (0,0254) | cm para R y d; m para s; km para h |
| Masa | g (0,001) · kg (1) · t, tonelada (1000) | kg |
| Tiempo (t, T) | ms (0,001) · s (1) · min (60) · h (3600) · d, día (86 400) | s |
| Frecuencia f | Hz (1) | Hz |
| rpm | campo propio, sin selector (rev/min) | rpm |
| Velocidad angular ω (MCU) | rad/s (1) · °/s (π/180) | rad/s |
| ω0 y ω_f (MCUV) | rad/s (1) · rpm (2π/60) · Hz = rev/s (2π) · °/s (π/180) | rpm |
| Velocidad lineal v | cm/s (0,01) · m/s (1) · km/h (1/3,6) · km/s (1000) | m/s |
| Aceleración (a_c, a_t, a) | cm/s² (0,01) · m/s² (1) · g (valor de g en ajustes) | m/s² |
| Aceleración angular α | rad/s² (1) · °/s² (π/180) · rpm/s (2π/60) | rad/s² |
| Ángulo (θ0, Δθ) | rad (1) · ° (π/180) · vueltas (2π) | ° para θ0; vueltas para Δθ |
| Fuerza | N (1) · kN (1000) | N |
| Punto de interés personalizado | cualquier unidad de longitud o % del radio | % |

**Reglas:**

- Cambiar la unidad de un campo **calculado** solo cambia cómo se muestra.
- Cambiar la unidad de un campo **ingresado** (dato) **convierte el número** para que la magnitud física no cambie (66 cm → 0,66 m). El paso a paso refleja la unidad actual.
- Todas las conversiones pasan por `units.ts` (`toSI(valor, unidad)` y `fromSI(valorSI, unidad)`). Ningún componente multiplica factores por su cuenta.

# 8. Entrada y formato de números

## 8.1 Lectura (función `parseNumber(text): ParseResult`)

| Entrada | Resultado |
|---|---|
| `0,33` o `0.33` | 0,33 (la coma y el punto son separador decimal) |
| `1,5e3`, `1.5E3`, `1,5×10^3`, `1,5x10^3`, `1,5·10^3` | 1500 |
| `100/3` | 33,333… (se acepta una sola división entre dos números, útil para 33⅓ rpm) |
| ` 12 ` | 12 (se ignoran espacios al inicio y al final) |
| `1.234,5` o `1,234.5` | Error **E-NUM-SEP**: «Usa un solo separador decimal (coma o punto) y no uses separador de miles». |
| `1 000` | Error **E-NUM-SEP** |
| `abc`, `2..3`, `--1` | Error **E-NUM-INV**: «No es un número válido». |
| vacío | Estado *vacío* (no es error) |
| `-3` | Se lee −3; luego cada campo valida su rango (sección 8.3). |

## 8.2 Comportamiento de los campos

- Se recalcula **mientras se escribe**, con una espera de 250 ms después de la última tecla, solo si el texto es válido. Si no es válido, el campo se marca en rojo con su mensaje debajo y los resultados mantienen el último cálculo válido, atenuados.
- Mientras el campo tiene el foco, se muestra exactamente lo que escribió el usuario. Al salir del campo, un dato conserva su texto; un campo calculado vuelve a mostrar el valor formateado.
- **Campo dato:** borde grueso de color primario y etiqueta «dato». **Campo calculado:** fondo gris claro, texto en cursiva y etiqueta «calculado». Escribir en un campo calculado lo convierte en dato (lo que eso implica depende del grupo; secciones 9 y 10).
- Borrar el campo fuente deja su grupo sin datos y los campos derivados muestran «—».
- `Enter` confirma; `Esc` restaura el valor anterior.

## 8.3 Rangos válidos

| Campo | Rango | Error si no cumple |
|---|---|---|
| R (radio o diámetro) | > 0 y ≤ 10¹³ m | E-RANGE-R |
| r_p personalizado | 0 ≤ r_p ≤ R (o 0 % a 100 %) | E-RANGE-RP |
| rpm, f, ω, v, a_c, F_c (MCU) | ≥ 0 | E-RANGE-NEG |
| T | > 0 | E-RANGE-T |
| m | ≥ 0 (si m = 0, F_c = 0) | E-RANGE-NEG |
| t | > 0 en MCUV; ≥ 0 en MCU | E-RANGE-T |
| ω0 (MCUV) | ≥ 0 | E-RANGE-W0 («Usa el selector de sentido para indicar hacia dónde gira») |
| ω_f, α, Δθ (MCUV) | cualquier número real | — |
| μ_s | 0 ≤ μ_s ≤ 2 | E-RANGE-MU |
| β (peralte) | 0° ≤ β < 90° | E-RANGE-BETA |

**Advertencias físicas:** si v > 3 × 10⁷ m/s (10 % de la velocidad de la luz) aparece **W-REL** («A esta velocidad la física clásica deja de ser exacta»). Si v ≥ 3 × 10⁸ m/s, error **E-LIGHT**.

## 8.4 Formato de salida (función `formatNumber(x, sigFigs)`)

- Coma decimal y sin separador de miles (para que el texto se pueda copiar y volver a pegar).
- Cifras significativas según los ajustes (3 a 6; por defecto **4**). Se eliminan los ceros finales después de la coma: 2,000 → «2»; 0,5000 → «0,5».
- Si 10⁻³ ≤ |x| < 10⁶, se usa notación decimal: 12,57 · 0,33 · 190,99 → «191».
- Si no, notación científica con superíndices: 2,662 × 10⁻⁶ · 3,844 × 10⁸.
- x = 0 → «0». T con ω = 0 → «∞ (no gira)».
- El número se muestra siempre con su unidad: «12,57 rad/s».

# 9. Motor de cálculo MCU (α = 0)

## 9.1 Paneles de entrada

| Panel | Campos |
|---|---|
| **A. Rueda** | Radio r ⇄ diámetro d (vinculados; editar uno actualiza el otro, con una sola unidad para ambos) · Punto de interés: Borde / Mitad / Eje / Otro (longitud o %) · Ángulo inicial θ0 · Sentido de giro: Antihorario / Horario · Al cambiar el radio, mantener: rapidez de giro (ω) / velocidad lineal (v) |
| **B. Rapidez de giro** | rpm · f · T · ω · v · a_c (cualquiera de ellos define el giro) |
| **C. Masa y fuerza** | m · F_c |
| **D. Tiempo y ángulo** | t · Δθ (rad, °, vueltas) · s (longitud de arco) |

**Resultados adicionales (solo lectura):** número de vueltas N = Δθ / 2π; posición final θ_f = θ0 + Δθ (mostrada entre 0° y 360°, junto con las vueltas completas); coordenadas del punto (x, y) = r_p (cos θ_f, sin θ_f); circunferencia C = 2πr_p; a_c expresada en g.

## 9.2 Fuente de rapidez

El grupo de rapidez (panel B más F_c del panel C) tiene **una sola fuente**: el último campo editado (`rateSource`). Todos los demás campos del grupo se calculan a partir de ella. Escribir en otro campo del grupo cambia la fuente a ese campo.

Restricciones:

- Si r_p = 0 (punto en el eje), los campos v, a_c y F_c quedan **deshabilitados como entrada** con el mensaje **E-AXIS** («En el eje v = 0: elige otro punto para usar este dato»). Si uno de ellos era la fuente, se convierte antes en fuente ω con su valor actual.
- F_c solo puede ser fuente si m > 0 (si no, **E-MASS**: «Ingresa la masa para calcular a partir de la fuerza»).

## 9.3 Orden de cálculo según la fuente

Primero se convierten todos los datos a SI, luego se obtiene R (de r o de d) y r_p, y después se aplica la fila correspondiente. El orden de esta tabla es **exactamente** el orden del paso a paso.

| Fuente | Secuencia de cálculo |
|---|---|
| rpm | f = rpm/60 → T = 1/f → ω = 2πf → v = ω·r_p → a_c = ω²·r_p → F_c = m·a_c |
| f | T = 1/f → rpm = 60·f → ω = 2πf → v = ω·r_p → a_c = ω²·r_p → F_c = m·a_c |
| T | f = 1/T → rpm = 60·f → ω = 2π/T → v = 2π·r_p/T → a_c = v²/r_p → F_c = m·a_c |
| ω | f = ω/2π → T = 2π/ω → rpm = 60·f → v = ω·r_p → a_c = ω²·r_p → F_c = m·a_c |
| v | ω = v/r_p → f = ω/2π → T = 2π·r_p/v → rpm = 60·f → a_c = v²/r_p → F_c = m·a_c |
| a_c | v = √(a_c·r_p) → ω = v/r_p → f = ω/2π → T = 1/f → rpm = 60·f → F_c = m·a_c |
| F_c | a_c = F_c/m → v = √(a_c·r_p) → ω = v/r_p → f = ω/2π → T = 1/f → rpm = 60·f |

Si ω = 0: f = 0, rpm = 0, T = ∞ («no gira»), v = a_c = F_c = 0. La animación queda quieta y el panel D solo acepta t.

## 9.4 Qué se conserva al cambiar el radio o el punto

Cuando cambian R, d o r_p, la política elegida en el panel A (`radiusPolicy`) decide qué se conserva:

- **Mantener ω (predeterminado).** Si la fuente es rpm, f, T u ω, no cambia. Si la fuente es v, a_c o F_c, primero se convierte en fuente ω con el valor actual de ω y luego se aplica el nuevo radio. Resultado: ω, f, T y rpm iguales; v, a_c y F_c cambian. *Así funciona el ejemplo de clase de la sección 25.*
- **Mantener v.** Antes de aplicar el nuevo radio, la fuente pasa a ser v con el valor actual de v. Resultado: v igual; ω, f, T, rpm, a_c y F_c cambian. *Ejemplo: una bicicleta que va a la misma velocidad con ruedas más pequeñas.*

Cambiar la masa **nunca** cambia el movimiento: si la fuente era F_c, se convierte en fuente ω antes de aplicar la nueva masa.

Al cambiar entre las opciones de la política aparece una nota corta debajo del selector: «Si cambias el radio, se conservará ω (rpm)» o «… se conservará v».

## 9.5 Grupo de tiempo y ángulo (panel D)

Fuente = último campo editado entre t, Δθ y s (`timeSource`).

| Fuente | Cálculo |
|---|---|
| t | Δθ = \|ω\|·t → s = Δθ·r_p |
| Δθ | t = Δθ/\|ω\| → s = Δθ·r_p |
| s | Δθ = s/r_p → t = Δθ/\|ω\| |

- Si ω = 0 y la fuente no es t → **E-NOROT** («La rueda no gira: no puede recorrer ese ángulo»).
- Si r_p = 0, s queda deshabilitado (E-AXIS).
- Cuando cambia la rapidez de giro, **se conserva la fuente del panel D** (si el usuario pidió «10 vueltas», se recalcula el tiempo).
- Si el panel D está vacío, la animación corre indefinidamente y no se muestran N ni θ_f.

# 10. Motor de cálculo MCUV (α constante)

## 10.1 Activación

Un selector en la parte superior del simulador cambia entre **«Velocidad constante (MCU)»** y **«Con aceleración angular (MCUV)»**. Al pasar de MCU a MCUV: ω0 = ω actual del MCU (en rpm), α vacío, t = t del panel D si existía; los datos iniciales son ω0 y t. Al volver a MCU: ω = ω(τ) del instante actual de la animación.

En MCUV el panel B se vuelve **de solo lectura** y muestra tres columnas: **Inicial (t = 0)**, **Instante τ** (en vivo, sincronizado con la animación) y **Final (t)**, con filas ω, rpm, f, T, v, a_c, a_t, a, φ, F_c, F_t y F_neta.

## 10.2 Variables y regla de «3 datos de 5»

Variables cinemáticas: **ω0, ω_f, α, t, Δθ**. Con aceleración constante hay 2 ecuaciones independientes, así que **3 datos determinan las otras 2**.

Entradas alternativas (cuentan como el dato de su variable):

- **a_t** como dato de α: α = a_t / r_p (requiere r_p > 0).
- **s** como dato de Δθ: Δθ = s / r_p (requiere r_p > 0).
- **Δθ en vueltas** es solo una unidad del mismo campo.

**Gestión de datos (`knowns`, lista ordenada de máximo 3):**

1. Al editar la variable X: si X ya es dato, pasa al final de la lista; si no, se agrega al final.
2. Si la lista queda con 4 elementos, se quita el **más antiguo que no tenga alfiler**. Ese campo pasa a «calculado» y aparece un aviso breve: «ω_f ahora se calcula (había más de 3 datos)».
3. Si los otros 3 tienen alfiler, la edición se rechaza con **E-MCUV-PIN** («Quita el alfiler de un dato para cambiar este»).
4. Cada campo tiene un **alfiler**; con un clic se fija como dato. Máximo 3 alfileres.
5. Arriba del panel se muestra una línea de estado: «Datos: ω0, ω_f, t · Se calculan: α, Δθ» o «Faltan 2 datos».
6. Con menos de 3 datos no se calcula nada, los derivados muestran «—» y la animación queda en pausa con el mensaje «Ingresa 3 de estos 5 datos: ω0, ω_f, α, t, Δθ».

## 10.3 Las 10 combinaciones

Validaciones previas: t > 0 cuando t es dato; ω0 ≥ 0 cuando ω0 es dato. Cuando una solución da ω0 < 0 se muestra **W-W0NEG** («ω0 resulta negativa: al inicio la rueda giraba en sentido contrario al elegido») y se sigue calculando.

| # | Datos | Incógnitas y fórmulas | Casos especiales |
|---|---|---|---|
| 1 | ω0, ω_f, t | α = (ω_f − ω0)/t · Δθ = (ω0 + ω_f)·t/2 | — |
| 2 | ω0, ω_f, α | t = (ω_f − ω0)/α · Δθ = (ω_f² − ω0²)/(2α) | α = 0 y ω_f = ω0 → **E-MCUV-INDET** («Con α = 0 la rapidez no cambia: ingresa t o Δθ»). α = 0 y ω_f ≠ ω0 → **E-MCUV-ALPHA0** («Sin aceleración la rapidez no puede cambiar»). t ≤ 0 → **E-MCUV-NEVER** («Con esa α la rueda nunca llega a ω_f; revisa el signo de α») |
| 3 | ω0, ω_f, Δθ | α = (ω_f² − ω0²)/(2Δθ) · t = 2Δθ/(ω0 + ω_f) | ω0 + ω_f = 0 o Δθ = 0 → E-MCUV-INDET. t ≤ 0 → E-MCUV-NEVER |
| 4 | ω0, α, t | ω_f = ω0 + α·t · Δθ = ω0·t + ½·α·t² | — |
| 5 | ω0, α, Δθ | Si α = 0: t = Δθ/ω0. Si no, resolver ½α·t² + ω0·t − Δθ = 0 y tomar **la menor raíz positiva**; luego ω_f = ω0 + α·t | Discriminante ω0² + 2αΔθ < 0 → **E-MCUV-STOP** («La rueda se detiene antes de girar ese ángulo. Ángulo máximo: Δθ_max = ω0²/(2|α|)», mostrado en las unidades del campo). Sin raíz positiva → E-MCUV-NEVER. α = 0 y ω0 = 0 → E-NOROT |
| 6 | ω0, t, Δθ | α = 2(Δθ − ω0·t)/t² · ω_f = 2Δθ/t − ω0 | — |
| 7 | ω_f, α, t | ω0 = ω_f − α·t · Δθ = ω_f·t − ½·α·t² | ω0 < 0 → W-W0NEG |
| 8 | ω_f, α, Δθ | ω0² = ω_f² − 2α·Δθ; ω0 = +√(…) · t = (ω_f − ω0)/α (si α = 0: t = Δθ/ω_f) | ω0² < 0 → **E-MCUV-IMPOSSIBLE** («No existe un movimiento con esos datos»). t ≤ 0 → E-MCUV-NEVER |
| 9 | ω_f, t, Δθ | ω0 = 2Δθ/t − ω_f · α = (ω_f − ω0)/t | ω0 < 0 → W-W0NEG |
| 10 | α, t, Δθ | ω0 = Δθ/t − ½·α·t · ω_f = ω0 + α·t | ω0 < 0 → W-W0NEG |

Después de resolver, **siempre** se verifica que se cumplan las 3 ecuaciones (ω_f = ω0 + αt, Δθ = ω0t + ½αt², ω_f² = ω0² + 2αΔθ) con tolerancia relativa de 10⁻⁹. Si alguna falla, es un error de programación (prueba unitaria obligatoria para las 10 combinaciones).

## 10.4 Valores instantáneos (función `instant(result, τ)`, con 0 ≤ τ ≤ t)

| Magnitud | Fórmula |
|---|---|
| ω(τ) | ω0 + α·τ |
| θ(τ) | θ0 + ω0·τ + ½·α·τ² (con signo según el sentido) |
| Vueltas | (θ(τ) − θ0)/2π |
| v(τ) | \|ω(τ)\|·r_p |
| a_c(τ) | ω(τ)²·r_p |
| a_t | α·r_p (constante) |
| a(τ) | √(a_c² + a_t²) |
| φ(τ) | ángulo entre la aceleración total y el radio: φ = atan(\|a_t\| / a_c) en grados (90° si a_c = 0) |
| F_c(τ), F_t, F_neta(τ) | m·a_c, m·a_t, m·a |
| rpm(τ), f(τ), T(τ) | a partir de \|ω(τ)\| |

En MCU se usan las mismas funciones con α = 0 (sin límite superior para τ).

## 10.5 Inversión del sentido de giro

Si α ≠ 0 y t_stop = −ω0/α cumple 0 < t_stop < t, la rueda se detiene y luego gira al revés (la ecuación con α constante lo permite). Se muestra **W-REV**: «La rueda se detiene en t = 2,5 s y después gira en sentido contrario. Si en tu problema la rueda solo frena, usa t = 2,5 s». Además:

- **Δθ** es el desplazamiento angular neto (lo que dan las fórmulas).
- Se agrega el resultado **«Ángulo total recorrido»** = |θ(t_stop) − θ0| + |θ(t) − θ(t_stop)|, también en vueltas.
- En las gráficas, la línea vertical t_stop aparece punteada con la etiqueta «se detiene».

# 11. Paso a paso

## 11.1 Estructura

```ts
interface Step {
  id: string;
  title: string;            // «Calcular la frecuencia»
  formulaId?: string;       // vínculo con el apartado de fórmulas (F05…)
  formulaTex: string;       // f = \frac{rpm}{60}
  substitutionTex: string;  // f = \frac{120}{60}
  result: { value: number; unit: UnitId }; // 2 Hz
  note?: string;            // explicación breve opcional
}
```

## 11.2 Reglas

1. Primero, un paso de **conversión** por cada dato que no esté en SI: «Convertir el diámetro a metros: d = 66 cm × (1 m / 100 cm) = 0,66 m». Para rpm: «ω = 120 rpm × (2π rad / 1 rev) × (1 min / 60 s)».
2. Luego, los pasos en el **orden exacto** de la tabla 9.3 (MCU), de la combinación de la tabla 10.3 (MCUV) o de la aplicación correspondiente.
3. En las sustituciones los números se muestran con las cifras significativas de los ajustes, pero el resultado se calcula con todos los decimales. Al final del panel se muestra la nota: «Los cálculos internos usan todos los decimales; por eso un resultado puede diferir en la última cifra si lo haces con valores redondeados».
4. Cada paso es plegable y muestra fórmula, sustitución y resultado. Al pasar el cursor por un paso, se resalta el campo correspondiente en la calculadora; con un clic en el código de la fórmula se abre esa tarjeta en el apartado de fórmulas.
5. Si hay un error, el paso a paso muestra los pasos válidos hasta ese punto y luego un recuadro rojo con el mensaje del error.
6. Botón **«Copiar procedimiento»**: copia los pasos como texto plano, uno por línea, con este formato: `3. Frecuencia: f = rpm/60 = 120/60 = 2 Hz`.
7. Hay un interruptor **«Mostrar solo resultados»** para ocultar las sustituciones.

## 11.3 Ejemplo esperado (bicicleta: d = 66 cm, 120 rpm, m = 0,5 kg)

1. Convertir el diámetro a metros: d = 66 cm × (1 m / 100 cm) = 0,66 m
2. Radio: r = d/2 = 0,66 m / 2 = 0,33 m
3. Frecuencia: f = rpm/60 = 120/60 = 2 Hz
4. Periodo: T = 1/f = 1/(2 Hz) = 0,5 s
5. Velocidad angular: ω = 2πf = 2π × 2 Hz = 12,57 rad/s
6. Velocidad lineal: v = ω·r = 12,57 rad/s × 0,33 m = 4,147 m/s
7. Aceleración centrípeta: a_c = ω²·r = (12,57 rad/s)² × 0,33 m = 52,11 m/s²
8. Fuerza centrípeta: F_c = m·a_c = 0,5 kg × 52,11 m/s² = 26,06 N

# 12. Animación

## 12.1 Lienzo

- Canvas 2D que ocupa el ancho de su columna, con relación de aspecto 1:1 (máximo 560 × 560 px en escritorio y el ancho total en celular). Se escala con `devicePixelRatio` para que se vea nítido.
- Centro (cx, cy) en el medio del lienzo. **Radio dibujado R_px = 0,38 × lado menor**, para dejar espacio a los vectores y etiquetas.
- **La rueda siempre se dibuja del mismo tamaño en pantalla, sea una moneda o la órbita de la Luna.** Para dar la escala real se muestran:
  - una **barra de escala** abajo a la izquierda, con una longitud redonda (1-2-5 × 10ⁿ en la unidad más legible). Ejemplo: «┝━━━━┥ 10 cm»;
  - el texto **«Diámetro: 66 cm»** abajo a la derecha.

## 12.2 Elementos y orden de dibujo

1. Fondo y, si está activo, **ejes** x e y punteados que pasan por el centro.
2. **Cuerpo según el estilo** (`style`):
   - `wheel` (rueda): aro grueso, llanta y **8 radios**;
   - `disc` (disco): círculo oscuro con 6 surcos concéntricos y etiqueta central de color;
   - `fan` (ventilador): 3 aspas;
   - `orbit` (órbita): círculo punteado de la trayectoria, un cuerpo central (la Tierra) en el centro y el objeto como un círculo pequeño;
   - `planet` (planeta): círculo con meridianos que giran.
   Los radios, surcos, aspas o meridianos son necesarios para que se **note el giro**.
3. Eje o buje central.
4. **Trayectoria del punto** (si está activa y r_p > 0): arco de la última vuelta recorrida, que se desvanece de opaco a transparente.
5. **Línea del radio** del centro al punto, delgada y gris.
6. **Arco del ángulo θ** (si está activo): desde el eje +x hasta la línea del radio, con la etiqueta «θ = 123° (+4 vueltas)».
7. **Punto marcado:** círculo azul de 7 px de radio con borde blanco, ubicado en r_p y θ(τ).
8. **Vectores** con origen en el punto (sección 12.3).
9. Leyenda, barra de escala y distintivo de escala de tiempo (sección 12.4).

## 12.3 Vectores

| Vector | Color | Dirección | Visible si |
|---|---|---|---|
| v | Verde #16a34a | Tangente, en el sentido del giro | showV y v > 0 |
| a_c | Rojo #dc2626 | Hacia el centro | showAc y a_c > 0 |
| a_t | Naranja #ea580c | Tangente; en el sentido de v si la rueda acelera, opuesto si frena | showAt, modo MCUV y α ≠ 0 |
| a (total) | Morado #7c3aed, línea discontinua | Suma vectorial a_c + a_t | showA y modo MCUV |

- Cada vector lleva una **etiqueta con su valor**: «v = 4,15 m/s». La etiqueta también lleva el nombre, para no depender solo del color.
- Punta de flecha de 10 px. Grosor de 3 px.
- **Escala de longitud:** se calcula cuando cambian los datos, **no en cada cuadro**, usando los valores **en el borde** para que un punto a la mitad del radio muestre una flecha de la mitad de largo:
  - k_v = 0,45·R_px / (|ω|_max · R)
  - k_a = 0,45·R_px / a_max_borde, con a_max_borde = el mayor entre a_c y |a| en el borde durante [0, t]. Todas las aceleraciones usan la **misma k_a**, para que sus tamaños sean comparables.
  - Longitud = k × valor, con un mínimo de 8 px si el valor es mayor que 0.
- **«Fijar escala de vectores»** (casilla): mientras está activa, k_v y k_a no se recalculan, así se puede **ver** que v se duplica cuando se duplican las rpm. Si una flecha supera 1,2·R_px, se recorta y termina en «»».

## 12.4 Escala de tiempo (cámara lenta / acelerado)

Una rueda a 1200 rpm no puede animarse en tiempo real: con 60 cuadros por segundo se vería quieta o girando al revés (efecto estroboscópico). Por eso la animación usa un factor `timeScale` = segundos simulados por segundo real.

**Algoritmo `autoTimeScale` (obligatorio y probado):**

1. Lista de factores «redondos»: 1, 2, 5 × 10ⁿ para n desde −4 hasta 8.
2. f_max = mayor frecuencia de giro en rev/s durante la simulación (en MCUV, max(|ω0|, |ω_f|)/2π).
3. Si f_max = 0 → factor 1.
4. Si f_max > 1 rev/s → el **mayor** factor de la lista que sea ≤ 1/f_max (cámara lenta: la rueda se ve dando como máximo 1 vuelta por segundo).
5. Si f_max < 0,1 rev/s → el **menor** factor de la lista que sea ≥ 0,1/f_max (acelerado: se ve al menos 1 vuelta cada 10 s).
6. Si no → 1 (tiempo real).
7. Solo en MCUV: si la duración visual t/factor supera 60 s, se aumenta el factor al siguiente valor de la lista mientras f_max·factor ≤ 1.

**Visualización:** un distintivo sobre el lienzo dice «Tiempo real», «Cámara lenta ×1/20» o «Acelerado ×500 000». Junto a él hay un selector para cambiarlo a mano (todos los valores de la lista más «Automático»).

**Advertencia:** si con el factor manual la rueda gira más de 1 vuelta por segundo en pantalla, aparece **W-STROBE**: «A esta velocidad la animación puede verse quieta o al revés (efecto estroboscópico)».

## 12.5 Reproducción

- Controles: **▶ Reproducir / ⏸ Pausa** · **⟲ Reiniciar** (τ = 0) · **⏮ / ⏭** (retrocede o avanza 1/24 de vuelta; en MCUV, 1/100 de t) · **deslizador de tiempo** (en MCUV de 0 a t; en MCU de 0 a max(t, 2T)) · casilla **«Repetir»** (solo MCUV).
- En MCU, τ avanza indefinidamente. En MCUV, se detiene en τ = t (o vuelve a 0 si «Repetir» está activo).
- **Lecturas en vivo** sobre el lienzo, actualizadas como máximo 10 veces por segundo para que se puedan leer: τ (tiempo simulado real), θ, vueltas, ω(τ), v(τ), a_c(τ).
- **Rendimiento:** el ciclo de `requestAnimationFrame` lee el estado del store con `getState()` y dibuja directamente; **no** provoca renderizados de React en cada cuadro. Meta: 60 cuadros por segundo en un celular de gama media.
- Si el sistema tiene `prefers-reduced-motion`, la animación inicia en pausa.
- La animación se pausa cuando la pestaña no está visible (`visibilitychange`).
- Cualquier cambio de datos reinicia τ a 0 en MCUV; en MCU conserva la fase visual para que el cambio de velocidad se vea fluido.

## 12.6 Leyenda y opciones de visualización

Casillas debajo del lienzo: Velocidad v · Aceleración centrípeta a_c · Aceleración tangencial a_t · Aceleración total a · Trayectoria · Ángulo θ · Ejes · Fijar escala de vectores. Cada casilla muestra la muestra de color del vector.

# 13. Gráficas

- Cuatro gráficas en una cuadrícula de 2 × 2 en escritorio y en pestañas en celular: **θ(t)** (en vueltas o rad, según un selector), **ω(t)**, **v(t)** y **a_c(t) con a_t(t)** juntas.
- **Dominio:** MCUV → [0, t]; MCU → [0, t] si hay t, o [0, 2T] si no (con ω = 0 → [0, 10 s]).
- 200 puntos calculados con `instant()`. Ejes con marcas redondas (1-2-5), etiquetas con unidades y título.
- **Cursor** vertical sincronizado con τ; arrastrar el cursor en la gráfica mueve la animación. Al pasar el puntero se muestra un recuadro con t y el valor.
- Debajo de cada gráfica, una nota didáctica fija:
  - θ(t): «La pendiente de esta curva es ω».
  - ω(t): «La pendiente es α. El área bajo la curva es Δθ».
  - v(t): «v = ω·r: misma forma que ω(t), escalada por r».
  - a(t): «a_c crece con ω²; a_t es constante si α es constante».
- Implementación propia en SVG (`components/charts/LineChart.tsx`), accesible: `role="img"` y un `aria-label` con un resumen («ω aumenta de 0 a 31,42 rad/s en 5 s»).

# 14. Comparar con referencia

Pensado para la pregunta «¿qué pasa si…?».

1. Botón **«Guardar como referencia»**: congela todos los resultados actuales (en SI) y el radio.
2. La tabla de resultados agrega tres columnas: **Referencia · Actual · Cambio**. «Cambio» muestra el factor redondeado a 3 cifras: «×2», «×0,5», «×4», «sin cambio» (si la diferencia relativa es menor que 10⁻⁶) o «—» si la referencia es 0.
3. Las filas cuyo factor es exactamente 2, ½, 4, ¼ o √2 (con tolerancia de 10⁻⁶) llevan un distintivo, porque ilustran relaciones lineales o cuadráticas.
4. En el lienzo, la rueda de referencia se dibuja como un **contorno gris punteado y estático**, con escala común: la más grande de las dos ruedas ocupa R_px y la otra se dibuja proporcional.
5. Botón **«Quitar referencia»**.
6. Encima de la tabla se muestra un resumen automático en una frase que lista lo que cambió, por ejemplo: «Cambiaste el radio ×0,5. Resultado: v ×0,5, a_c ×0,5, F_c ×0,5; ω, T y f sin cambio».

# 15. Apartado de fórmulas y significados

## 15.1 Interacción

- Pestaña **«Fórmulas»** con un buscador (por nombre, símbolo o palabra) y filtros por categoría: Geometría · Periodo y frecuencia · Velocidades · Aceleraciones y fuerzas · Aceleración angular (MCUV) · Aplicaciones · Conversiones.
- **Glosario de símbolos** (tabla 15.2) en una columna lateral. Al hacer clic en un símbolo se **resaltan todas las fórmulas que lo usan** (borde de color y desplazamiento hasta la primera) y las demás se atenúan. Otro clic quita el resaltado.
- **Cada tarjeta de fórmula** muestra:
  1. la fórmula grande, renderizada con KaTeX;
  2. su nombre;
  3. «Qué dice», en una frase;
  4. sus símbolos con significado y unidad (al hacer clic en un símbolo se resalta en el glosario);
  5. «Cuándo usarla»;
  6. «Error común»;
  7. un botón **«Probar con los datos actuales»**, que muestra la fórmula con los valores del simulador sustituidos (solo si todos los valores existen; si no, el botón queda deshabilitado con «Faltan datos: …»).
- **Desde el simulador:** cada campo tiene un ícono ⓘ que abre una ventana con la definición del símbolo, su unidad y enlaces a las fórmulas donde aparece.
- Los datos están en `src/data/formulas.ts` como arreglo `{ id, category, name, tex, symbols: SymbolId[], says, whenToUse, commonMistake }`. El resaltado se basa en `symbols`.

## 15.2 Magnitudes y símbolos

| Símbolo | Nombre | Qué significa | Unidad (SI) |
|---|---|---|---|
| R | Radio de la rueda | Distancia del centro al borde de la rueda (o radio de la trayectoria). | m |
| r_p | Radio del punto | Distancia del centro al punto que se analiza. En el borde, r_p = R. | m |
| d | Diámetro | Distancia de borde a borde pasando por el centro. d = 2R. | m |
| C | Circunferencia | Longitud de una vuelta completa: C = 2πr. | m |
| θ | Posición angular | Ángulo que ha girado la rueda, medido desde el eje +x. | rad |
| θ0 | Ángulo inicial | Posición angular del punto en t = 0. | rad |
| Δθ | Desplazamiento angular | Ángulo girado durante un intervalo. | rad |
| N | Número de vueltas | Vueltas completas o fraccionarias: N = Δθ/2π. | — |
| s | Longitud de arco | Distancia recorrida por el punto sobre la circunferencia. | m |
| T | Periodo | Tiempo que tarda en dar una vuelta completa. | s |
| f | Frecuencia | Número de vueltas por segundo. | Hz (1/s) |
| rpm | Revoluciones por minuto | Número de vueltas por minuto. rpm = 60 f. | rev/min |
| ω | Velocidad angular | Qué tan rápido cambia el ángulo: cuántos radianes gira por segundo. | rad/s |
| ω0, ω_f | Velocidad angular inicial y final | ω al comienzo y al final del intervalo (MCUV). | rad/s |
| v | Velocidad lineal (tangencial) | Rapidez de un punto; su dirección es tangente a la circunferencia. | m/s |
| α | Aceleración angular | Qué tan rápido cambia ω (si la rueda acelera o frena). | rad/s² |
| a_t | Aceleración tangencial | Cambio en la rapidez del punto; sigue la tangente. | m/s² |
| a_c | Aceleración centrípeta | Cambio en la dirección de la velocidad; apunta siempre al centro. | m/s² |
| a | Aceleración total | Suma vectorial de a_c y a_t. | m/s² |
| φ | Ángulo de la aceleración | Ángulo entre la aceleración total y el radio. | ° |
| m | Masa | Masa del objeto que gira. | kg |
| F_c | Fuerza centrípeta | Fuerza neta hacia el centro, necesaria para mantener la trayectoria circular. | N |
| F_t | Fuerza tangencial | Fuerza a lo largo de la tangente que cambia la rapidez. | N |
| t | Tiempo | Intervalo durante el cual gira. | s |
| τ | Instante de la animación | Tiempo simulado actual (0 ≤ τ ≤ t). | s |
| g | Gravedad | Aceleración de la gravedad en la superficie terrestre (9,8 por defecto). | m/s² |
| μ_s | Coeficiente de fricción estática | Qué tanto agarre hay entre la llanta y la vía. | — |
| β | Ángulo de peralte | Inclinación de la vía en una curva peraltada. | ° |
| N_f | Fuerza normal | Fuerza perpendicular que la vía ejerce sobre el carro. | N |
| G | Constante de gravitación | 6,6743 × 10⁻¹¹. | N·m²/kg² |
| M | Masa del cuerpo central | Masa del planeta o estrella alrededor del que se orbita. | kg |
| h | Altura de la órbita | Distancia desde la superficie del cuerpo central. | m |

## 15.3 Fórmulas

| ID | Fórmula | Para qué sirve | Error común |
|---|---|---|---|
| F01 | d = 2r | Pasar entre diámetro y radio. | Usar el diámetro como si fuera el radio en v = ωr. |
| F02 | C = 2πr | Distancia recorrida en una vuelta. | Confundir con el área πr². |
| F03 | s = θ·r | Distancia recorrida en el borde si se conoce el ángulo girado. | Usar θ en grados: debe estar en radianes. |
| F04 | T = 1/f · f = 1/T | Pasar entre periodo y frecuencia. | Creer que T y f son proporcionales. |
| F05 | f = rpm/60 | Pasar de rpm a Hz. | Olvidar dividir entre 60. |
| F06 | f = N/t | Frecuencia a partir de vueltas contadas en un tiempo. | Invertir el cociente (t/N es el periodo). |
| F07 | ω = 2π/T = 2πf | Velocidad angular a partir del periodo o la frecuencia. | Tomar f como si fuera ω (falta el 2π). |
| F08 | ω = rpm·2π/60 | Convertir rpm a rad/s. | Multiplicar por 60 en lugar de dividir. |
| F09 | Δθ = ω·t · Δθ = 2πN | Ángulo girado con ω constante. | Mezclar vueltas y radianes. |
| F10 | v = ω·r = 2πr/T | Rapidez de un punto. Un punto más lejos del centro va más rápido, aunque ω sea igual. | Pensar que todos los puntos de la rueda tienen la misma v. |
| F11 | a_c = v²/r = ω²·r | Aceleración hacia el centro. Crece con el cuadrado de la rapidez. | Concluir que con v constante no hay aceleración. |
| F12 | F_c = m·a_c = m·v²/r | Fuerza neta necesaria hacia el centro (la aportan la tensión, la fricción, la gravedad…). | Dibujar la «fuerza centrífuga» como una fuerza real hacia afuera. |
| F13 | a_t = α·r | Aceleración a lo largo de la tangente cuando la rueda cambia su ω. | Confundir a_t con a_c. |
| F14 | a = √(a_c² + a_t²) · tan φ = a_t/a_c | Aceleración total cuando hay ambas componentes. | Sumar las magnitudes directamente (a_c + a_t). |
| F15 | ω_f = ω0 + α·t | Velocidad angular final con α constante. | Olvidar el signo negativo de α al frenar. |
| F16 | Δθ = ω0·t + ½·α·t² | Ángulo girado con α constante. | Olvidar el ½. |
| F17 | ω_f² = ω0² + 2α·Δθ | Relaciona velocidad angular y ángulo sin usar el tiempo. | Usar Δθ en vueltas en lugar de radianes. |
| F18 | Δθ = (ω0 + ω_f)·t/2 | Ángulo girado usando la ω promedio. | Usarla cuando α no es constante. |
| F19 | 1 vuelta = 2π rad = 360° | Conversiones de ángulo. | Escribir 1 vuelta = π rad. |
| F20 | F_t = m·a_t · F_neta = m·a | Fuerzas cuando la rueda acelera o frena. | Ignorar F_t en el MCUV. |
| F21 | n = a_c/g | Expresar la aceleración en «g» (lavadoras, centrífugas, pilotos). | Olvidar dividir entre g. |
| F22 | v_max = √(μ_s·g·R) | Rapidez máxima en una curva plana sin derrapar. | Pensar que depende de la masa (se cancela). |
| F23 | tan β = v²/(R·g) | Peralte ideal: la curva se toma sin necesidad de fricción. | Usar v en km/h sin convertir. |
| F24 | v_max = √(R·g·(sin β + μ_s cos β)/(cos β − μ_s sin β)) · v_min = √(R·g·(sin β − μ_s cos β)/(cos β + μ_s sin β)) | Rango de rapidez en una curva peraltada con fricción. | Olvidar que si el numerador de v_min es negativo, v_min = 0. |
| F25 | F = G·M·m/R² | Fuerza de gravedad que actúa como fuerza centrípeta en una órbita. | Usar la altura h en lugar de R = R_cuerpo + h. |
| F26 | v = √(G·M/R) | Rapidez de una órbita circular. | Pensar que depende de la masa del satélite. |
| F27 | T = 2π·√(R³/(G·M)) | Periodo orbital (tercera ley de Kepler). | Usar R en km. |
| F28 | R = R_cuerpo + h | Radio de la órbita a partir de la altura. | Olvidar sumar el radio del planeta. |

# 16. Casos predefinidos

Un menú desplegable **«Casos»** en la parte superior del simulador. Al elegir un caso se carga todo el estado (modo, datos, unidades, punto, estilo), se borra la referencia y aparece debajo del lienzo una tarjeta con la descripción y una **pregunta para explorar**.

| Caso | Datos que se cargan | Punto · estilo | Resultados esperados (4 cifras) | Pregunta para explorar |
|---|---|---|---|---|
| Rueda de bicicleta | d = 66 cm; 120 rpm; m = 0,5 kg | Borde · rueda | f = 2 Hz; T = 0,5 s; ω = 12,57 rad/s; v = 4,147 m/s; a_c = 52,11 m/s²; F_c = 26,06 N | ¿Qué pasa con v y a_c si la rueda mide la mitad y gira a las mismas rpm? |
| Disco de vinilo (LP) | d = 30 cm; 100/3 rpm (33⅓); m = 5 g | Borde · disco | T = 1,8 s; ω = 3,491 rad/s; v = 0,5236 m/s; a_c = 1,828 m/s² | ¿Qué punto del disco va más rápido: el borde o cerca de la etiqueta? |
| Ventilador de pedestal | d = 40 cm; 1200 rpm; m = 10 g | Borde · ventilador | f = 20 Hz; T = 0,05 s; v = 25,13 m/s; a_c = 3158 m/s² | ¿Por qué la animación necesita cámara lenta? |
| Rueda de carro a 60 km/h | d = 63,5 cm; v = 60 km/h; m = 30 g (contrapeso de balanceo) | Borde · rueda | ω = 52,49 rad/s; 501,3 rpm; a_c = 874,9 m/s² ≈ 89,3 g | Si el carro va al doble de velocidad, ¿cuántas veces aumenta a_c? |
| Lavadora centrifugando | d = 48 cm; 1200 rpm; m = 1 kg | Borde · disco | v = 30,16 m/s; a_c = 3790 m/s² ≈ 386,7 g; F_c = 3790 N | ¿Por qué la ropa sale casi seca? |
| Luna alrededor de la Tierra | R = 384 400 km; T = 27,32 d (27,321661 d); m = 7,342 × 10²² kg | Borde · órbita | v = 1023 m/s; a_c = 2,723 × 10⁻³ m/s²; F_c = 1,999 × 10²⁰ N | ¿Qué fuerza aporta la F_c? (Compara con la aplicación de órbitas.) |
| La Tierra: punto en el ecuador | R = 6378 km (6378,137); T = 86 164 s (día sidéreo); m = 1 kg | Borde · planeta | v = 465,1 m/s; a_c = 0,03392 m/s² | ¿Por qué no sentimos esta velocidad? |
| La Tierra: punto en Bogotá | R = 6378,137 km; punto personalizado r_p = 6357,5 km (R·cos 4,61°); T = 86 164 s; m = 1 kg | Otro · planeta | v = 463,6 m/s; a_c = 0,03381 m/s² | ¿Cuánto más lento va Bogotá que un punto en el ecuador? |
| Estación Espacial Internacional | R = 6791 km; v = 7,66 km/s; m = 420 t | Borde · órbita | T = 5570 s ≈ 92,8 min; a_c = 8,640 m/s² | ¿Por qué los astronautas «flotan» si a_c es casi g? |
| Arranque de un motor (MCUV) | Modo MCUV; ω0 = 0; ω_f = 300 rpm; t = 5 s; d = 66 cm; m = 0,5 kg | Borde · rueda | α = 6,283 rad/s²; Δθ = 78,54 rad = 12,5 vueltas; a_t = 2,073 m/s² | ¿Cómo cambia la flecha de a_c durante el arranque? |
| Frenado (MCUV) | Modo MCUV; ω0 = 20 rad/s; α = −4 rad/s²; ω_f = 0; R = 0,5 m | Borde · rueda | t = 5 s; Δθ = 50 rad = 7,958 vueltas | ¿Cuántas vueltas da antes de detenerse si frena con el doble de α? |

Los valores exactos de cada caso van en `src/data/presets.ts`; el texto mostrado al usuario puede redondear, pero el dato almacenado no.

# 17. Aplicaciones (casos reales con física adicional)

Pestaña **«Aplicaciones»** con tres subpestañas. Cada una usa los mismos componentes de entrada (secciones 7 y 8), tiene su propio paso a paso y su propio diagrama, y aparece en el apartado de fórmulas.

## 17.1 Curva plana con fricción

- **Entradas:** radio de la curva R (m) · rapidez del carro v (km/h por defecto; opcional) · μ_s (con botones rápidos: asfalto seco 0,7 · asfalto mojado 0,4 · grava 0,35 · hielo 0,1) · masa m (kg, por defecto 1000).
- **Salidas:** v_max = √(μ_s·g·R) en m/s y km/h. Si hay v: F_c necesaria = m·v²/R; fricción máxima disponible f_max = μ_s·m·g; veredicto.
- **Veredicto:** si F_c ≤ f_max → verde: «Toma la curva sin derrapar (usa el X % del agarre disponible)». Si no → rojo: «Derrapa: necesita X N hacia el centro y la fricción solo aporta Y N. Velocidad máxima: Z km/h».
- **Diagrama:** vista desde arriba con la curva como un arco, el carro como un rectángulo y la flecha de fricción hacia el centro. Debajo, una vista lateral con mg, N_f y f.
- **Nota didáctica fija:** «La masa se cancela: un camión y una moto tienen la misma velocidad máxima si μ_s es igual».

## 17.2 Curva peraltada

- **Entradas:** R · ángulo de peralte β (°) · μ_s (0 = sin fricción) · v (opcional) · m.
- **Salidas:**
  - v_ideal = √(R·g·tan β) (sin necesidad de fricción).
  - Con μ_s > 0: v_max y v_min según F24. Si cos β − μ_s sin β ≤ 0 → v_max = «sin límite». Si sin β − μ_s cos β ≤ 0 → v_min = 0 («puede ir tan despacio como quiera sin deslizarse hacia abajo»).
  - Si hay v: fuerza normal N_f = m(g cos β + (v²/R) sin β); fricción necesaria f = m((v²/R) cos β − g sin β) (positiva = hacia abajo de la pendiente, es decir, hacia el centro; negativa = hacia arriba); μ mínimo necesario = |f|/N_f; veredicto (¿|f| ≤ μ_s N_f?); peralte ideal para esa v: β = atan(v²/(R·g)).
- **Diagrama:** corte transversal de la vía inclinada β, el carro y los vectores mg, N_f y f (la dirección de f cambia según el caso). Flecha de F_c horizontal hacia el centro.

## 17.3 Órbitas circulares

- **Entradas:** cuerpo central (Tierra · Luna · Marte · Sol · Personalizado con M y radio) · radio de la órbita R, **o** altura h, **o** periodo T (la fuente es el último editado) · masa del satélite m.
- **Cuerpos:**

| Cuerpo | M (kg) | Radio medio |
|---|---|---|
| Tierra | 5,9722 × 10²⁴ | 6371 km |
| Luna | 7,342 × 10²² | 1737,4 km |
| Marte | 6,417 × 10²³ | 3389,5 km |
| Sol | 1,989 × 10³⁰ | 695 700 km |

- **Cálculos:** R = R_cuerpo + h (o h = R − R_cuerpo). Si la fuente es T: R = (G·M·T²/4π²)^(1/3). Luego v = √(GM/R), T = 2π√(R³/GM), ω = v/R, a_c = GM/R², F = G·M·m/R², vueltas por día = 86 400/T.
- **Validación:** si R ≤ R_cuerpo → **E-ORBIT-INSIDE** («La órbita quedaría dentro del cuerpo central»).
- **Atajos:** EEI (h = 420 km) · GPS (h = 20 200 km) · Geoestacionaria (T = 86 164 s) · Luna (R = 384 400 km).
- **Animación:** reutiliza el lienzo con el estilo `orbit` y la escala de tiempo automática.
- **Botón «Abrir en el simulador»:** pasa R, v y m al simulador MCU para ver que F_c = F gravitacional.

# 18. Ejercicios y modo docente

## 18.1 Generador con semilla

- Generador pseudoaleatorio `mulberry32` con semilla = hash FNV-1a de `"<códigoTaller>#<númeroEstudiante>#<idPlantilla>"`. **El mismo código y número producen siempre los mismos datos**, en cualquier equipo.
- Los datos se redondean a «pasos de libro» (por ejemplo, rpm múltiplos de 10) para que parezcan datos de un texto.

## 18.2 Plantillas

| ID | Enunciado (con datos generados) | Rangos | Preguntas y respuesta |
|---|---|---|---|
| E1 | Una rueda de {d} cm de diámetro gira a {n} rpm. | d: 40–80, paso 2; n: 60–300, paso 10 | f (Hz), T (s), ω (rad/s), v (m/s) |
| E2 | Un punto está a {r} m del eje y se mueve a {v} m/s. | r: 0,10–0,50, paso 0,05; v: 1–10, paso 0,5 | ω (rad/s), a_c (m/s²) |
| E3 | Una piedra de {m} kg atada a una cuerda de {r} m da {N} vueltas en {t} s. | m: 0,1–2, paso 0,1; r: 0,3–1,5, paso 0,1; N: 5–30; t: 5–20 | T (s), v (m/s), tensión = F_c (N) |
| E4 | Dos puntos de un disco a {n} rpm están a {r1} cm y {r2} cm del centro. | n: 30–90, paso 5; r1: 2–8; r2: 10–20 | v1, v2 (m/s); razón a_c2/a_c1 |
| E5 | Una rueda parte del reposo y alcanza {n} rpm en {t} s. | n: 120–600, paso 30; t: 2–10 | α (rad/s²), vueltas en ese tiempo |
| E6 | Una rueda gira a {n} rpm y frena con α = −{a} rad/s² hasta detenerse. | n: 200–800, paso 50; a: 2–10 | tiempo hasta detenerse (s), vueltas |
| E7 | Un carro toma una curva plana de {R} m de radio; μ_s = {mu}. | R: 30–200, paso 10; mu: 0,3–0,9, paso 0,05 | v_max (km/h) |
| E8 | Una curva sin fricción de {R} m está diseñada para {v} km/h. | R: 50–300, paso 10; v: 40–120, paso 10 | peralte β (°) |
| E9 | Un satélite orbita la Tierra a {h} km de altura. | h: 300–36 000, paso 100 | v (km/s), T (min) |
| E10 | El tambor de una lavadora de {d} cm de diámetro centrifuga a {n} rpm. | d: 40–56, paso 2; n: 600–1400, paso 100 | a_c (m/s²) y en g |

## 18.3 Modo estudiante (práctica)

1. El estudiante escribe el código del taller y su número (1–60), o elige «Práctica libre» (semilla aleatoria).
2. Se muestra el enunciado con los datos. Cada pregunta tiene un campo de respuesta y un selector de unidad.
3. **«Comprobar»:** la respuesta es correcta si, convertida a SI, cumple |x − x*| / |x*| ≤ **2 %**.
4. **Detección de errores típicos:** si la respuesta es incorrecta pero x·k o x/k coincide (con 2 % de tolerancia) con la respuesta correcta para algún k de esta lista, se muestra el mensaje específico:

| Factor k | Mensaje |
|---|---|
| 2π | «Revisa la diferencia entre f (vueltas/s) y ω (rad/s): difieren en 2π». |
| 60 | «Revisa la conversión entre minutos y segundos (rpm ↔ Hz)». |
| 3,6 | «Revisa la conversión entre km/h y m/s». |
| 100 o 1000 | «Revisa las unidades de longitud (cm, m, km)». |
| 2 | «¿Usaste el diámetro en lugar del radio?». |
| 4 | «¿Usaste el diámetro dentro de una fórmula con r o r²?». |
| π/180 o 180/π | «Revisa grados y radianes». |
| g | «Revisa si la respuesta se pide en m/s² o en g». |

   Si no coincide ningún factor: «No coincide. Revisa tu procedimiento».
5. Tras 2 intentos fallidos aparece **«Ver pista»**, que muestra la fórmula necesaria (tarjeta del apartado de fórmulas). Tras 3, aparece **«Ver solución»**, que muestra el paso a paso completo.
6. **«Abrir en el simulador»** carga los datos del ejercicio en el simulador.
7. Al terminar: «Respondiste bien 3 de 4 preguntas». No se guarda nada fuera del dispositivo.

## 18.4 Modo docente (talleres imprimibles)

1. El docente escribe un **código de taller** (por ejemplo `FIS1-G3-2026`), el número de estudiantes (1–60) y selecciona las plantillas.
2. Vista previa: una sección por estudiante con «Taller FIS1-G3-2026 · Estudiante 7», los enunciados y espacios para responder.
3. Casilla **«Incluir clave de respuestas»**: agrega al final una tabla por estudiante con las respuestas (4 cifras y unidades).
4. **«Imprimir / Guardar PDF»** usa `window.print()` con una hoja de estilos de impresión: tamaño carta, salto de página por estudiante, sin menús ni botones y en blanco y negro legible.
5. El estudiante que escriba el mismo código y número en el modo práctica obtiene **exactamente los mismos datos**, así puede verificar sus respuestas.

# 19. Interfaz

## 19.1 Navegación

Encabezado fijo con el nombre de la app y pestañas: **Simulador · Fórmulas · Aplicaciones · Ejercicios · Ayuda**. A la derecha: botón de ajustes (⚙) y botón **«Compartir»**. En celular, las pestañas pasan a una barra inferior con íconos y texto.

## 19.2 Simulador en escritorio (≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ App de movimiento circular   [Simulador][Fórmulas][Aplicaciones]...  ⚙ ⇪ │
├──────────────────────────────────────────────────────────────────────────┤
│ Modo: (•) Velocidad constante ( ) Con aceleración   Casos: [Bicicleta ▾] │
├────────────────────┬───────────────────────────────┬─────────────────────┤
│ A. Rueda        ▾  │  [Cámara lenta ×1/2]  [Auto ▾]│ Resultados          │
│  r [33   ][cm▾]    │                               │ ┌─────┬────┬────┬──┐│
│  d [66   ] dato    │        ( rueda animada )      │ │     │Ref │Act │Δ ││
│  Punto: Borde|...  │       con vectores v, a_c     │ ├─────┼────┼────┼──┤│
│  Sentido: ↺ | ↻    │                               │ │ v   │... │... │×½││
│ B. Rapidez de giro │  ┝━━┥ 10 cm   Diámetro: 66 cm │ └─────┴────┴────┴──┘│
│  rpm [120] dato    │  ▶ ⟲ ⏮ ⏭ ───●──────── τ=1,2 s │ [Guardar referencia]│
│  f   2 Hz  calc.   │  ☑v ☑a_c ☐a_t ☐a ☑trayect.    │                     │
│  ...               ├───────────────────────────────┤ Paso a paso       ▾ │
│ C. Masa y fuerza   │  Gráficas  θ(t) | ω(t)        │ 1. Convertir d ...  │
│ D. Tiempo y ángulo │            v(t) | a(t)        │ 2. r = d/2 ...      │
└────────────────────┴───────────────────────────────┴─────────────────────┘
```

Proporción de columnas: 320 px · flexible · 360 px. Los paneles A–D son acordeones; A y B empiezan abiertos.

## 19.3 Tableta (768–1023 px) y celular (< 768 px)

- **Tableta:** dos columnas (entradas | lienzo); resultados y paso a paso debajo, a todo el ancho.
- **Celular:** el lienzo queda **fijo arriba** (40 % del alto de la pantalla, se puede plegar a una barra delgada); debajo, pestañas internas **Datos · Resultados · Paso a paso · Gráficas**. Los campos tienen como mínimo 44 px de alto y usan `inputmode="decimal"`.

## 19.4 Componentes clave

- **`QuantityInput`:** etiqueta con símbolo (por ejemplo «ω — velocidad angular»), campo, `UnitSelect`, distintivo dato/calculado, alfiler (solo en MCUV), ícono ⓘ y mensaje de error.
- **`PointSelector`:** control segmentado Borde · Mitad · Eje · Otro; con «Otro» aparece un `QuantityInput` en longitud o %.
- **`DirectionToggle`:** ↺ Antihorario / ↻ Horario.
- **Toasts** (avisos breves, 4 s) para cambios automáticos («ω_f ahora se calcula»).

## 19.5 Ayuda

Página con: qué es MCU y MCUV en un párrafo; cómo usar los datos y los calculados; cómo funciona la regla de 3 datos de 5; qué significa la escala de tiempo; atajos de teclado (Espacio = reproducir/pausa, R = reiniciar, ← / → = paso) y un enlace al glosario. En la primera visita aparece un aviso cerrable: «¿Primera vez? Prueba el caso *Rueda de bicicleta*».

## 19.6 Ajustes

| Ajuste | Opciones | Por defecto |
|---|---|---|
| Valor de g | 9,8 · 9,81 · 9,80665 · personalizado | 9,8 m/s² |
| Cifras significativas | 3 · 4 · 5 · 6 | 4 |
| Tema | Claro · Oscuro · Según el sistema | Según el sistema |
| Tamaño del texto | Normal · Grande | Normal |
| Unidades al iniciar | Prácticas (cm, rpm, km/h) · SI | Prácticas |

## 19.7 Guardado automático

- El estado y los ajustes se guardan en `localStorage` (claves `movcirc:v1:state` y `movcirc:v1:settings`) 500 ms después de cada cambio.
- Al abrir la app se restauran. Si los datos guardados son inválidos o de otra versión, se ignoran y se cargan los valores por defecto (caso Bicicleta), sin mostrar errores.
- Botón **«Reiniciar todo»** en ajustes, con confirmación dentro de la propia página (no usar `window.confirm`).

## 19.8 Compartir configuración

- **«Compartir»** genera una URL con el estado codificado en el fragmento: `#s=<JSON compacto en base64url>`. Incluye modo, datos con unidades, punto, sentido, estilo y política; no incluye ajustes personales.
- La URL se copia al portapapeles con el aviso «Enlace copiado». Al abrir un enlace así, el estado se valida y se carga con el aviso «Configuración cargada desde un enlace»; si es inválido, se ignora con el aviso «El enlace no es válido».
- Útil para que el docente comparta un escenario exacto con el grupo.

## 19.9 Accesibilidad

- Contraste AA en ambos temas. Ninguna información depende solo del color: los vectores tienen etiquetas y las casillas tienen texto.
- Toda la app se usa con teclado; el foco es visible.
- Cada campo tiene un `<label>` asociado y los errores están vinculados con `aria-describedby`.
- Los resultados se anuncian en una región `aria-live="polite"` como máximo una vez por segundo.
- El lienzo tiene un `aria-label` que se actualiza con un resumen («Rueda de 66 cm girando a 120 rpm, sentido antihorario»).

## 19.10 Estilo visual

Interfaz limpia, con fondo claro, tarjetas con bordes suaves y tipografía del sistema (`system-ui`). Color primario azul #2563eb. Los colores de los vectores (sección 12.3) se usan solo para los vectores y sus etiquetas, de forma consistente en el lienzo, las gráficas, la leyenda y el paso a paso.

# 20. Catálogo de mensajes

Todos los mensajes viven en `src/core/messages.ts` (código y parámetros) y su texto en `src/i18n/es.ts`.

| Código | Tipo | Texto |
|---|---|---|
| E-NUM-SEP | Error | Usa un solo separador decimal (coma o punto) y no uses separador de miles. |
| E-NUM-INV | Error | No es un número válido. |
| E-RANGE-R | Error | El radio debe ser mayor que 0. |
| E-RANGE-RP | Error | El punto debe estar entre el eje (0) y el borde ({R}). |
| E-RANGE-NEG | Error | Este valor no puede ser negativo. |
| E-RANGE-T | Error | El tiempo y el periodo deben ser mayores que 0. |
| E-RANGE-W0 | Error | ω0 debe ser positiva o cero. Usa el selector de sentido para indicar hacia dónde gira. |
| E-RANGE-MU | Error | μ_s debe estar entre 0 y 2. |
| E-RANGE-BETA | Error | El peralte debe estar entre 0° y 90°. |
| E-AXIS | Error | En el eje v = 0: elige otro punto para usar este dato. |
| E-MASS | Error | Ingresa la masa para calcular a partir de la fuerza. |
| E-NOROT | Error | La rueda no gira: no puede recorrer ese ángulo. |
| E-MCUV-PIN | Error | Quita el alfiler de un dato para cambiar este. |
| E-MCUV-INDET | Error | Con estos datos el problema queda indeterminado: {detalle}. |
| E-MCUV-ALPHA0 | Error | Sin aceleración angular la rapidez no puede cambiar de ω0 a ω_f. |
| E-MCUV-NEVER | Error | Con esa α la rueda nunca llega a ese estado; revisa el signo de α. |
| E-MCUV-STOP | Error | La rueda se detiene antes de girar ese ángulo. Ángulo máximo: {max}. |
| E-MCUV-IMPOSSIBLE | Error | No existe un movimiento con esos datos. |
| E-ORBIT-INSIDE | Error | La órbita quedaría dentro del cuerpo central. |
| E-LIGHT | Error | Ningún objeto con masa puede ir a la velocidad de la luz o más rápido. |
| W-REL | Advertencia | A esta velocidad la física clásica deja de ser exacta. |
| W-W0NEG | Advertencia | ω0 resulta negativa: al inicio la rueda giraba en sentido contrario al elegido. |
| W-REV | Advertencia | La rueda se detiene en t = {tStop} y después gira en sentido contrario. |
| W-STROBE | Advertencia | A esta velocidad la animación puede verse quieta o al revés (efecto estroboscópico). |

# 21. Requisitos no funcionales

| Requisito | Meta |
|---|---|
| Sin conexión | Después de la primera carga, toda la app funciona sin internet (incluidas las fuentes de KaTeX). |
| Tamaño | Paquete JavaScript inicial ≤ 400 KB comprimido con gzip. |
| Rendimiento | Animación a 60 fps en un celular de gama media; recálculo en menos de 16 ms. |
| Lighthouse | ≥ 90 en Rendimiento, Accesibilidad, Buenas prácticas y PWA. |
| Privacidad | No se envía ningún dato a ningún servidor. No hay cookies ni analítica. |
| Robustez | Ninguna entrada del usuario provoca una excepción no controlada; hay un *error boundary* de React con el mensaje «Algo salió mal. Reiniciar» que vuelve al caso por defecto. |
| Mantenibilidad | Física en `src/core/` con ≥ 90 % de cobertura de líneas. |

# 22. Casos de prueba

Los resultados se comparan con tolerancia relativa de 10⁻³, salvo que se indique otra. Con **g = 9,8 m/s²**.

## 22.1 Lectura de números y unidades

| # | Entrada | Esperado |
|---|---|---|
| P1 | `"0,33"` | 0,33 |
| P2 | `"0.33"` | 0,33 |
| P3 | `"1,5e3"` y `"1,5×10^3"` | 1500 |
| P4 | `"100/3"` | 33,3333… |
| P5 | `"1.234,5"` | E-NUM-SEP |
| P6 | `"abc"` | E-NUM-INV |
| P7 | `""` | vacío (no es error) |
| P8 | toSI(66, 'cm') | 0,66 |
| P9 | toSI(60, 'km/h') | 16,6667 |
| P10 | toSI(120, 'rpm' como ω) | 12,5664 |
| P11 | toSI(1, 'g') | 9,8 |
| P12 | formatNumber(26.0558, 4) | «26,06» |
| P13 | formatNumber(2.66170e-6, 4) | «2,662 × 10⁻⁶» |
| P14 | formatNumber(2.0, 4) | «2» |

## 22.2 MCU

| # | Datos | Esperado |
|---|---|---|
| M1 | d = 66 cm, 120 rpm, m = 0,5 kg | r = 0,33 m; f = 2 Hz; T = 0,5 s; ω = 12,5664 rad/s; v = 4,1469 m/s; a_c = 52,1115 m/s²; F_c = 26,0558 N |
| M2 | M1 y luego d = 33 cm (política mantener ω) | ω = 12,5664; T = 0,5; v = 2,0735; a_c = 26,0558; F_c = 13,0279 |
| M3 | M1 y luego d = 33 cm (política mantener v) | v = 4,1469; ω = 25,1327; rpm = 240; a_c = 104,223 |
| M4 | r = 0,5 m, fuente v = 10 m/s, m = 1 kg | ω = 20; f = 3,1831; T = 0,314159; rpm = 190,986; a_c = 200; F_c = 200 |
| M5 | r = 2 m, fuente a_c = 1 g | a_c = 9,8; v = 4,42719; ω = 2,21359; T = 2,83845; rpm = 21,1383 |
| M6 | r = 0,8 m, m = 0,2 kg, fuente F_c = 50 N | a_c = 250; v = 14,1421; ω = 17,6777; rpm = 168,809 |
| M7 | M1 con punto en Mitad | r_p = 0,165; v = 2,0735; a_c = 26,0558; ω sin cambio |
| M8 | M1 con punto en Eje | v = 0; a_c = 0; campos v, a_c y F_c deshabilitados (E-AXIS) |
| M9 | M1, panel D: Δθ = 10 vueltas | t = 5 s; s = 20,7345 m |
| M10 | rpm = 0 | T = ∞; v = 0; Δθ como fuente → E-NOROT |
| M11 | M1 con fuente F_c y luego m = 1 kg | ω se conserva (12,5664); F_c = 52,1115 |
| M12 | r = 1 m, v = 3,5 × 10⁷ m/s | W-REL |

## 22.3 MCUV (las 10 combinaciones)

| # | Datos | Esperado |
|---|---|---|
| V1 (comb. 1) | ω0 = 0; ω_f = 300 rpm; t = 5 s | α = 6,28319 rad/s²; Δθ = 78,5398 rad = 12,5 vueltas |
| V2 (comb. 2) | ω0 = 20; ω_f = 0; α = −4 | t = 5 s; Δθ = 50 rad |
| V3 (comb. 3) | ω0 = 4; ω_f = 8; Δθ = 12 | α = 2; t = 2 |
| V4 (comb. 4) | ω0 = 2; α = 3; t = 2 | ω_f = 8; Δθ = 10 |
| V5 (comb. 5) | ω0 = 10; α = −2; Δθ = 21 | t = 3 (menor raíz positiva; la otra es 7); ω_f = 4 |
| V6 (comb. 5, error) | ω0 = 10; α = −2; Δθ = 30 | E-MCUV-STOP con Δθ_max = 25 rad |
| V7 (comb. 6) | ω0 = 2; t = 2; Δθ = 10 | α = 3; ω_f = 8 |
| V8 (comb. 7) | ω_f = 8; α = 3; t = 2 | ω0 = 2; Δθ = 10 |
| V9 (comb. 8) | ω_f = 10; α = 2; Δθ = 16 | ω0 = 6; t = 2 |
| V10 (comb. 9) | ω_f = 12; t = 4; Δθ = 32 | ω0 = 4; α = 2 |
| V11 (comb. 10) | α = 3; t = 2; Δθ = 10 | ω0 = 2; ω_f = 8 |
| V12 (comb. 2, error) | ω0 = 5; ω_f = 5; α = 0 | E-MCUV-INDET |
| V13 (inversión) | ω0 = 10; α = −2; t = 8 | ω_f = −6; W-REV con t_stop = 5 s; Δθ neto = 16 rad; ángulo total recorrido = 25 + 9 = 34 rad |
| V14 (instantáneos) | V1 con r = 0,33 m, en τ = t | a_t = 2,07345; a_c = 325,697; a = 325,704 |
| V15 (regla de 3) | Editar en orden ω0, ω_f, t, α | Datos finales: ω_f, t, α; ω0 pasa a calculado |

## 22.4 Aplicaciones

| # | Datos | Esperado |
|---|---|---|
| A1 | Curva plana R = 50 m, μ_s = 0,7 | v_max = 18,5203 m/s = 66,673 km/h |
| A2 | A1 con m = 1000 kg y v = 72 km/h | F_c = 8000 N; f_max = 6860 N; derrapa |
| A3 | Peralte sin fricción R = 100 m, v = 72 km/h | β ideal = 22,2035° |
| A4 | Peralte R = 100, β = 15°, μ_s = 0,4 | v_max = 27,0771 m/s (97,478 km/h); v_min = 0 |
| A5 | Peralte R = 100, β = 30°, μ_s = 0,2 | v_ideal = 23,7866; v_max = 29,3471; v_min = 18,2078 |
| A6 | Peralte R = 100, β = 15°, m = 1000, v = 25 m/s | N_f = 11 083,7 N; f = 3500,61 N (hacia el centro); μ mínimo = 0,31583 |
| A7 | Órbita alrededor de la Tierra, R = 384 400 km | v = 1018,31 m/s; T = 2,37184 × 10⁶ s = 27,4518 días |
| A8 | Órbita alrededor de la Tierra, fuente T = 86 164 s | R = 42 164,2 km; h = 35 793 km; v = 3074,67 m/s |
| A9 | Órbita alrededor de la Tierra, h = 420 km | v = 7661,31 m/s; T = 92,8238 min; a_c = 8,64316 m/s² |
| A10 | Órbita alrededor de la Tierra, h = −100 km | E-ORBIT-INSIDE |

## 22.5 Escala de tiempo

| # | f_max (rev/s) | Factor esperado |
|---|---|---|
| S1 | 2 (120 rpm) | 0,5 (cámara lenta ×1/2) |
| S2 | 20 (1200 rpm) | 0,05 (×1/20) |
| S3 | 0,5 | 1 (tiempo real) |
| S4 | 4,23623 × 10⁻⁷ (Luna) | 500 000 |
| S5 | 1,16058 × 10⁻⁵ (Tierra) | 10 000 |
| S6 | 0 | 1 |

## 22.6 Ejercicios

| # | Caso | Esperado |
|---|---|---|
| X1 | Mismo código, número y plantilla dos veces | Datos idénticos |
| X2 | Números de estudiante 1 y 2 | Datos distintos (al menos un valor) |
| X3 | Respuesta correcta × 1,01 | Correcta (dentro del 2 %) |
| X4 | E1 con ω pedida y respuesta = f | Mensaje del factor 2π |
| X5 | E1 con v pedida, calculada con el diámetro | Mensaje «¿Usaste el diámetro…?» |
| X6 | E7: el estudiante escribe el valor en m/s pero deja seleccionada la unidad km/h | Mensaje del factor 3,6 |

## 22.7 Extremo a extremo (Playwright)

| # | Flujo | Esperado |
|---|---|---|
| U1 | Abrir la app y elegir el caso Bicicleta | Se ven «4,147 m/s» y «52,11 m/s²» |
| U2 | Guardar referencia y cambiar d a 33 | La columna Cambio muestra ×0,5 en v y a_c, y «sin cambio» en ω y T |
| U3 | Escribir «1.234,5» en rpm | Mensaje E-NUM-SEP visible y resultados atenuados |
| U4 | Cambiar a MCUV y cargar el caso Arranque | α = 6,283 rad/s² y 12,5 vueltas |
| U5 | Compartir y abrir el enlace en una pestaña nueva | Mismo estado cargado |
| U6 | Recargar la página | El estado se restaura |
| U7 | Modo docente con 3 estudiantes e «Incluir clave» | La vista de impresión muestra 3 secciones y la clave |
| U8 | Desconectar la red (modo sin conexión) y recargar | La app sigue funcionando |

# 23. Plan de implementación por fases

| Fase | Contenido | Termina cuando |
|---|---|---|
| 1. Base y núcleo | Proyecto Vite + TS + React + Zustand + Vitest + ESLint. `units`, `numberFormat`, `constants`, `messages`, `mcu`, `mcuv`, `kinematics`, `timeScale`, `applications/*`. | Pasan P1–P14, M1–M12, V1–V15, A1–A10 y S1–S6. |
| 2. Simulador MCU | Diseño general, pestañas, paneles A–D, `QuantityInput`, tabla de resultados, comparar con referencia. | Se puede reproducir el ejemplo de clase de la sección 25 sin animación. |
| 3. Animación | `WheelCanvas`, los 5 estilos, vectores con escala, escala de tiempo, controles de reproducción y leyenda. | 60 fps; W-STROBE funciona; prueba visual manual con los 11 casos. |
| 4. MCUV y gráficas | Selector de modo, regla de 3 datos con alfileres, columnas inicial/instante/final, W-REV, gráficas SVG con cursor. | V1–V15 visibles en la interfaz; el cursor de las gráficas mueve la animación. |
| 5. Paso a paso y fórmulas | `steps.ts`, panel paso a paso, copiar, `formulas.ts` con F01–F28 y el glosario, resaltado, «Probar con los datos actuales», íconos ⓘ. | El paso a paso de M1 coincide con la sección 11.3. |
| 6. Casos y aplicaciones | `presets.ts` con los 11 casos; las 3 aplicaciones con diagramas y paso a paso. | Cada caso muestra los resultados esperados de la tabla 16. |
| 7. Ejercicios | PRNG, plantillas E1–E10, verificador con errores típicos, modo estudiante, modo docente e impresión. | Pasan X1–X6 y U7. |
| 8. Cierre | Ajustes, guardado, compartir, PWA, accesibilidad, error boundary, ayuda, tema oscuro y pruebas extremo a extremo. | Lista de la sección 24 completa. |

# 24. Criterios de aceptación (lista final)

- [ ] Todas las pruebas de la sección 22 pasan (`npm run test` y `npm run test:e2e`).
- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Cualquier campo de los paneles B, C y D puede ser dato, y los demás se calculan.
- [ ] La política «mantener ω / mantener v» funciona como dice la sección 9.4.
- [ ] La regla de 3 datos de 5 funciona con alfileres, avisos y las 10 combinaciones.
- [ ] Todos los errores y advertencias de la sección 20 aparecen en los casos correspondientes.
- [ ] La animación respeta el sentido de giro, el punto de interés, la escala de tiempo y la escala de vectores.
- [ ] El paso a paso existe para MCU, MCUV y las 3 aplicaciones, y se puede copiar.
- [ ] Las 28 fórmulas y el glosario completo están en el apartado de fórmulas, con resaltado interactivo.
- [ ] Los 11 casos predefinidos cargan y muestran los valores esperados.
- [ ] Los ejercicios son reproducibles con el mismo código y número; el taller se imprime con clave.
- [ ] La app funciona sin conexión, en celular (360 px) y con teclado.
- [ ] Ningún texto de interfaz está fuera de `src/i18n/es.ts`.
- [ ] `README.md` explica cómo instalar, ejecutar, probar y desplegar. `DECISIONES.md` registra las decisiones tomadas durante el desarrollo.

# 25. Ejemplo de uso en clase

Una rueda de bicicleta de 66 cm de diámetro gira a 120 rpm, con un punto de 0,5 kg en el borde. La app calcula:

| Magnitud | Resultado |
|---|---|
| Radio r | 0,33 m |
| Frecuencia f | 2 Hz |
| Periodo T | 0,5 s |
| Velocidad angular ω | ≈ 12,57 rad/s |
| Velocidad lineal v | ≈ 4,147 m/s |
| Aceleración centrípeta a_c | ≈ 52,11 m/s² |
| Fuerza centrípeta F_c | ≈ 26,06 N |

Luego el profesor pregunta: ¿qué pasa si la rueda se reduce a la mitad con las mismas rpm? El estudiante pulsa «Guardar como referencia», cambia el diámetro a 33 cm y la tabla muestra que v y a_c se reducen a la mitad (×0,5), mientras ω y T no cambian. La rueda de referencia aparece punteada al lado de la nueva. Si cambia la política a «mantener v» (la bicicleta va igual de rápido con ruedas pequeñas), descubre que ω se duplica y a_c se multiplica por 4. Esa conclusión cuesta mucho más con solo lápiz y papel.

# 26. Conclusión

Una app de movimiento circular con rueda ajustable, todas las variables disponibles y un apartado de fórmulas comentadas conecta la teoría con lo que el estudiante ve. Reduce errores de unidades, permite explorar «qué pasaría si» y ayuda a estudiar con autonomía. Con el MCUV, las aplicaciones a curvas y órbitas y el generador de ejercicios por estudiante, es un complemento directo para el curso de Física 1, tanto para quien aprende como para quien enseña.
