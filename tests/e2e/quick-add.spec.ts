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

async function recordQuickTask(page: Page) {
  await page.getByRole('button', { name: 'Grabar tarea' }).click();
  await expect(page.getByRole('status')).toHaveText('Grabando');
  await page.getByRole('button', { name: 'Detener' }).click();
  await expect(page.getByRole('status')).toHaveText('Tarea creada');
}

test('leaves a low-confidence quick voice task unassigned', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await installMicrophoneMock(page);

  await page.goto('/quick-add');

  await expect(page.getByRole('heading', { name: 'Deci tu tarea' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible();
  await recordQuickTask(page);
  await expect(page.getByText('Llamar al proveedor')).toBeVisible();
  await expect(page.getByText('Quedo en Inbox')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grabar tarea' })).toBeEnabled();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const hasVerticalOverflow = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight);
  expect(hasHorizontalOverflow).toBe(false);
  expect(hasVerticalOverflow).toBe(false);

  await page.goto('/?view=inbox');
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  await expect(page.getByText('Llamar al proveedor')).toBeVisible();
});

test('assigns a high-confidence quick voice task to an existing project', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await installMicrophoneMock(page);
  await page.route('**/api/voice-task/transcribe', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transcript: 'Preparar lanzamiento del producto' }),
    });
  });

  await page.goto('/quick-add');

  await recordQuickTask(page);
  await expect(page.getByText('Preparar lanzamiento del producto')).toBeVisible();
  await expect(page.getByText('Asignada a Lanzamiento del producto')).toBeVisible();

  await page.goto('/projects/e2e-project-launch');
  await expect(page.getByText('Preparar lanzamiento del producto')).toBeVisible();
});

test('assigns an unassigned quick voice task manually', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await installMicrophoneMock(page);

  await page.goto('/quick-add');
  await recordQuickTask(page);

  await page.goto('/?view=inbox');
  await page.getByRole('combobox', { name: 'Proyecto para Llamar al proveedor' }).selectOption('e2e-project-launch');
  await page.getByRole('button', { name: 'Asignar' }).click();

  await expect(page.getByText('Llamar al proveedor')).toHaveCount(0);

  await page.goto('/projects/e2e-project-launch');
  await expect(page.getByText('Llamar al proveedor')).toBeVisible();
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
  await expect(page.getByText('Llamar al proveedor')).toHaveCount(0);
});

test('shows a clear error when quick voice task saving fails', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await installMicrophoneMock(page);
  await page.route('**/api/quick-task', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'No se pudo guardar la tarea.' }),
    });
  });

  await page.goto('/quick-add');

  await page.getByRole('button', { name: 'Grabar tarea' }).click();
  await page.getByRole('button', { name: 'Detener' }).click();
  await expect(page.getByRole('main').getByText('No se pudo guardar la tarea.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grabar tarea' })).toBeEnabled();

  await page.goto('/');
  await expect(page.getByText('Llamar al proveedor')).toHaveCount(0);
});

test('shows quick voice fallback cards in Tareas when stored without plazo', async ({ page, request }) => {
  await request.post('/api/e2e', {
    data: {
      action: 'createProject',
      project: {
        title: 'Fallback sin plazo',
        description: 'Creada desde captura rapida por voz.',
        plazo: '',
      },
    },
  });

  await page.goto('/?view=projects');

  await expect(
    page.getByTestId('project-section-Tareas').getByRole('heading', { name: 'Fallback sin plazo' }),
  ).toBeVisible();
  await expect(
    page.getByTestId('project-section-sin-plazo').getByRole('heading', { name: 'Fallback sin plazo' }),
  ).toHaveCount(0);
});
