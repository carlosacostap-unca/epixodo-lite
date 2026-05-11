import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/e2e', {
    data: { action: 'reset' },
  });
});

async function installMicrophoneMock(page: Page) {
  await page.addInitScript(() => {
    class MockMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      mimeType = 'audio/webm';
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onstop: ((event: Event) => void) | null = null;
      state: RecordingState = 'inactive';

      start() {
        this.state = 'recording';
      }

      stop() {
        if (this.state === 'inactive') return;

        this.state = 'inactive';
        this.ondataavailable?.({
          data: new Blob(['audio'], { type: 'audio/webm' }),
        } as BlobEvent);
        this.onstop?.(new Event('stop'));
      }
    }

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    });
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: MockMediaRecorder,
    });
  });
}

test('creates a Tareas card automatically from quick voice capture', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await installMicrophoneMock(page);

  await page.goto('/quick-add');

  await expect(page.getByRole('heading', { name: 'Decí tu tarea' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible();
  await page.getByRole('button', { name: 'Grabar tarea' }).click();
  await expect(page.getByRole('status')).toHaveText('Grabando');
  await page.getByRole('button', { name: 'Detener' }).click();
  await expect(page.getByRole('status')).toHaveText('Tarea creada');
  await expect(page.getByText('Llamar al proveedor')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grabar tarea' })).toBeEnabled();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);

  await page.goto('/');
  await expect(
    page.getByTestId('project-section-Tareas').getByRole('heading', { name: 'Llamar al proveedor' }),
  ).toBeVisible();
});

test('does not create a task when quick voice transcription fails', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await installMicrophoneMock(page);
  await page.route('**/api/voice-task/transcribe', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'OpenAI no pudo transcribir el audio.' }),
    });
  });

  await page.goto('/quick-add');

  await page.getByRole('button', { name: 'Grabar tarea' }).click();
  await page.getByRole('button', { name: 'Detener' }).click();
  await expect(page.getByRole('main').getByText('OpenAI no pudo transcribir el audio.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grabar tarea' })).toBeEnabled();

  await page.goto('/');
  await expect(
    page.getByTestId('project-section-Tareas').getByRole('heading', { name: 'Llamar al proveedor' }),
  ).toHaveCount(0);
});

test('shows a clear error when quick voice task saving fails', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await installMicrophoneMock(page);
  await page.route('**/api/quick-task', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'No se pudo guardar la tarea en Tareas.' }),
    });
  });

  await page.goto('/quick-add');

  await page.getByRole('button', { name: 'Grabar tarea' }).click();
  await page.getByRole('button', { name: 'Detener' }).click();
  await expect(page.getByRole('main').getByText('No se pudo guardar la tarea en Tareas.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grabar tarea' })).toBeEnabled();

  await page.goto('/');
  await expect(
    page.getByTestId('project-section-Tareas').getByRole('heading', { name: 'Llamar al proveedor' }),
  ).toHaveCount(0);
});
