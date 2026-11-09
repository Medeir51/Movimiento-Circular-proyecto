import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { es, fill } from '../../src/i18n/es';

/** Elige un caso del menú «Casos». */
async function loadCase(page: Page, id: string) {
  await page.getByLabel(es.simulator.presetsLabel).selectOption(id);
}

async function results(page: Page) {
  return page.locator('section[aria-labelledby="results-heading"]');
}

test.describe('22.7 Extremo a extremo', () => {
  test('U1: abrir la app y elegir el caso Bicicleta', async ({ page }) => {
    await page.goto('/');
    await loadCase(page, 'vinyl');
    await loadCase(page, 'bicycle');
    const r = await results(page);
    await expect(r.getByText('4,147 m/s', { exact: true })).toBeVisible();
    await expect(r.getByText('52,11 m/s²', { exact: true })).toBeVisible();
  });

  test('U2: guardar referencia y cambiar d a 33', async ({ page }) => {
    await page.goto('/');
    await loadCase(page, 'vinyl');
    await loadCase(page, 'bicycle');
    await page.getByRole('button', { name: es.results.saveReference }).click();
    const d = page.locator('#f-d');
    await d.fill('33');
    await d.press('Enter');
    const change = (key: string) => page.locator(`tr[data-key="${key}"] td`).last();
    await expect(change('v')).toContainText('×0,5');
    await expect(change('ac')).toContainText('×0,5');
    await expect(change('omega')).toHaveText(es.results.noChange);
    await expect(change('T')).toHaveText(es.results.noChange);
  });

  test('U3: escribir «1.234,5» en rpm', async ({ page }) => {
    await page.goto('/');
    const rpm = page.locator('#f-rpm');
    await rpm.fill('1.234,5');
    await expect(page.getByText(es.messages['E-NUM-SEP']).first()).toBeVisible();
    await expect(page.getByText(es.simulator.staleResults)).toBeVisible();
    await expect(rpm).toHaveAttribute('aria-invalid', 'true');
  });

  test('U4: cambiar a MCUV y cargar el caso Arranque', async ({ page }) => {
    await page.goto('/');
    await page.getByText(es.simulator.modeMCUV, { exact: true }).click();
    await loadCase(page, 'motorStart');
    const r = await results(page);
    await expect(r.getByText('6,283 rad/s²', { exact: true })).toBeVisible();
    await expect(r.getByText('12,5 vueltas', { exact: true }).first()).toBeVisible();
  });

  test('U5: compartir y abrir el enlace en una pestaña nueva', async ({
    page,
    context,
    browser,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await loadCase(page, 'fan');
    await page.locator('#f-theta0').fill('30');
    await page.locator('#f-theta0').press('Enter');
    await page.getByRole('button', { name: es.nav.share }).click();
    await expect(page.getByText(es.share.copied)).toBeVisible();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain('#s=');

    // Contexto nuevo: sin el estado guardado de la primera pestaña.
    const other = await browser.newContext();
    const p2 = await other.newPage();
    await p2.goto(url);
    await expect(p2.getByText(es.share.loaded)).toBeVisible();
    await expect((await results(p2)).getByText('25,13 m/s', { exact: true })).toBeVisible();
    await expect(p2.locator('#f-theta0')).toHaveValue('30');
    await expect(p2.locator('#f-d')).toHaveValue('40');
    expect(p2.url()).not.toContain('#s=');
    await other.close();
  });

  test('U5b: un enlace inválido se ignora con aviso', async ({ page }) => {
    await page.goto('/#s=esto-no-es-valido');
    await expect(page.getByText(es.share.invalid)).toBeVisible();
    await expect((await results(page)).getByText('4,147 m/s', { exact: true })).toBeVisible();
  });

  test('U6: recargar la página restaura el estado', async ({ page }) => {
    await page.goto('/');
    await loadCase(page, 'washer');
    await expect((await results(page)).getByText('30,16 m/s', { exact: true })).toBeVisible();
    await page.waitForTimeout(800);
    await page.reload();
    await expect((await results(page)).getByText('30,16 m/s', { exact: true })).toBeVisible();
    await expect(page.getByLabel(es.simulator.presetsLabel)).toHaveValue('washer');
  });

  test('U7: modo docente con 3 estudiantes e «Incluir clave»', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: es.nav.exercises }).first().click();
    await page.getByText(es.exercises.teacher, { exact: true }).click();
    await page.getByLabel(es.exercises.code).fill('FIS1-G3-2026');
    await page.getByLabel(es.exercises.students).fill('3');
    await expect(page.getByLabel(es.exercises.includeKey)).toBeChecked();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-sheet]')).toHaveCount(3);
    for (const n of [1, 2, 3]) {
      await expect(page.locator(`[data-sheet="${n}"]`)).toBeVisible();
      await expect(
        page.getByText(fill(es.exercises.sheetTitle, { code: 'FIS1-G3-2026', n })),
      ).toBeVisible();
    }
    await expect(page.getByTestId('answer-key')).toBeVisible();
    await expect(page.getByRole('heading', { name: es.exercises.keyTitle })).toBeVisible();
    // Sin menús ni botones en la impresión.
    await expect(page.locator('header')).toBeHidden();
    await expect(page.getByRole('button', { name: es.exercises.print })).toBeHidden();
  });

  test('U7b: el estudiante obtiene los mismos datos con el mismo código y número', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: es.nav.exercises }).first().click();
    await page.getByText(es.exercises.teacher, { exact: true }).click();
    await page.getByLabel(es.exercises.code).fill('FIS1-G3-2026');
    await page.getByLabel(es.exercises.students).fill('2');
    const teacherStatement = await page.locator('[data-sheet="2"] li p').first().innerText();
    await page.getByText(es.exercises.practice, { exact: true }).click();
    await page.getByLabel(es.exercises.code).fill('FIS1-G3-2026');
    await page.getByLabel(es.exercises.student).fill('2');
    await page.getByRole('button', { name: es.exercises.start }).click();
    const statement = teacherStatement.split('. ').slice(1).join('. ').trim();
    await expect(page.getByText(statement).first()).toBeVisible();
  });

  test('U8: sin conexión, la app sigue funcionando', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page
      .waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
        timeout: 20_000,
      })
      .catch(async () => {
        await page.reload();
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      });
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: es.app.name })).toBeVisible();
    await expect((await results(page)).getByText('4,147 m/s', { exact: true })).toBeVisible();
    // KaTeX también funciona sin conexión.
    await expect(page.locator('.katex').first()).toBeVisible();
    await context.setOffline(false);
  });
});
