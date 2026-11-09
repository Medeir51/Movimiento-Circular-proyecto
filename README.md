# App de movimiento circular

Simulador de movimiento circular uniforme (MCU) y con aceleración angular constante (MCUV) para Física 1, en español de Colombia. Calcula todas las magnitudes con unidades, anima la rueda con sus vectores, grafica θ(t), ω(t), v(t) y a(t), explica cada cálculo paso a paso, incluye un apartado de fórmulas, casos reales (curvas y órbitas) y un generador de ejercicios con modo docente.

Es una aplicación web estática (SPA) instalable como PWA: después de la primera carga funciona sin conexión y no envía datos a ningún servidor.

## Requisitos

- Node.js 20.19 o superior (o 22.12+). Se desarrolló con Node.js 26.
- npm (viene con Node.js).

## Instalar y ejecutar

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Revisa los tipos (`tsc`) y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve `dist/` en <http://localhost:4173> (con el service worker activo). |
| `npm run test` | Pruebas unitarias del núcleo de física (Vitest, sección 22). |
| `npm run test:coverage` | Igual, con cobertura de `src/core/` (mínimo 90 % de líneas). |
| `npm run test:e2e` | Pruebas extremo a extremo con Playwright (U1–U8). Compila y levanta `vite preview` solo. |
| `npm run lint` | ESLint y Prettier (`--check`). |
| `npm run format` | Formatea todo con Prettier. |

### Pruebas extremo a extremo

Por defecto Playwright usa su propio Chromium; la primera vez hay que descargarlo:

```bash
npx playwright install chromium
```

Para usar un navegador ya instalado (por ejemplo Microsoft Edge en Windows), define `PW_CHANNEL`:

```bash
PW_CHANNEL=msedge npm run test:e2e
```

En PowerShell: `$env:PW_CHANNEL = "msedge"; npm run test:e2e`.

## Desplegar

`npm run build` deja todo en `dist/` (archivos estáticos). Se puede publicar en cualquier servidor estático:

- **Netlify / Vercel / servidor propio:** publicar la carpeta `dist/`.
- **GitHub Pages en una subcarpeta** (`https://usuario.github.io/mi-repo/`): compilar con la ruta base:

  ```bash
  BASE_PATH=/mi-repo/ npm run build
  ```

El service worker (`vite-plugin-pwa`) precarga todos los recursos, incluidas las fuentes de KaTeX, para el uso sin conexión.

## Estructura

```
src/
  core/          Física pura en TypeScript (sin React ni DOM): unidades, números, MCU, MCUV,
                 paso a paso, escala de tiempo, aplicaciones y ejercicios. 100 % probada.
  data/          Fórmulas (F01–F28), glosario y casos predefinidos.
  store/         Store de Zustand, selectores memoizados, guardado y enlace para compartir.
  components/    Interfaz en React (simulador, lienzo, gráficas SVG, fórmulas, aplicaciones,
                 ejercicios, ayuda).
  i18n/es.ts     Todos los textos visibles de la interfaz.
  styles/        Variables del tema (claro y oscuro) e impresión.
tests/
  core/          Pruebas unitarias (P1–P14, M1–M12, V1–V15, A1–A10, S1–S6, X1–X6 y casos).
  e2e/           Pruebas de Playwright (U1–U8).
scripts/
  generate-icons.mjs   Genera los íconos PNG de la PWA (node scripts/generate-icons.mjs).
```

La especificación completa está en [docs/App_movimiento_circular_especificacion.md](docs/App_movimiento_circular_especificacion.md) (versión 2.0). Las decisiones tomadas donde la especificación no era explícita están en [DECISIONES.md](DECISIONES.md).

## Notas de uso

- Escribe en cualquier campo para volverlo **dato**; los demás se **calculan**. Enter confirma y Esc restaura.
- Coma o punto decimal, notación científica (`1,5e3`, `1,5×10^3`) y divisiones simples (`100/3`).
- Atajos en el simulador: Espacio (reproducir/pausa), R (reiniciar), ← / → (paso).
- **Compartir** copia un enlace con la configuración del simulador; **Ajustes** (⚙) cambia g, cifras significativas, tema y tamaño del texto.
