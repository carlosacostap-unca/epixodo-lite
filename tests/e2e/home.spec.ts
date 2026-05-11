import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/e2e', {
    data: { action: 'reset' },
  });
});

test('loads the project board home page from e2e fixtures', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Epixodo Lite/);
  await expect(page.getByRole('heading', { level: 1, name: 'Panel' }).first()).toBeVisible();
  await expect(page.getByText('Workspace')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Vistas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Conversar', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Hoy/ }).first()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: /Inbox/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Proyectos/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sin fecha' })).toBeVisible();
  await expect(page.getByText('Preparar notas de lanzamiento')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grabar tarea' })).toBeVisible();
});

test('creates a task from conversational mode', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Conversar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Conversar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hablar' })).toBeVisible();
  await page.getByRole('button', { name: 'Crear tarea para manana' }).click();

  await expect(page.getByText(/cree la tarea/i)).toBeVisible();

  await page.goto('/?view=inbox');
  await expect(page.getByText('manana')).toBeVisible();
});

test('answers today task questions from conversational mode', async ({ page, request }) => {
  const dueToday = new Date().toISOString().replace('T', ' ');

  await request.post('/api/e2e', {
    data: {
      action: 'createTask',
      task: {
        title: 'Conversar sobre lo de hoy',
        description: '',
        is_completed: false,
        project: 'e2e-project-launch',
        realization_at: '',
        due_at: dueToday,
        plazo: '',
      },
    },
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Conversar', exact: true }).click();
  await page.getByRole('button', { name: 'Que tengo para hoy?' }).click();

  await expect(page.getByText('Conversar sobre lo de hoy')).toBeVisible();
});

test('updates task metadata through the conversational API', async ({ page, request }) => {
  await request.post('/api/e2e', {
    data: {
      action: 'createTask',
      task: {
        title: 'Ordenar facturas',
        description: '',
        is_completed: false,
        project: '',
        realization_at: '',
        due_at: '',
        plazo: '',
      },
    },
  });

  const response = await request.post('/api/conversation', {
    data: { message: 'cambia plazo de Ordenar facturas a Corto' },
  });
  const body = await response.json();
  expect(body.reply).toMatch(/plazo Corto/i);

  await page.goto('/?view=inbox');
  await expect(page.getByText('Ordenar facturas')).toBeVisible();
  await expect(page.getByText('Plazo: Corto')).toBeVisible();
});

test('confirms before deleting a task through the conversational API', async ({ page, request }) => {
  await request.post('/api/e2e', {
    data: {
      action: 'createTask',
      task: {
        title: 'Eliminar prueba conversacional',
        description: '',
        is_completed: false,
        project: '',
        realization_at: '',
        due_at: '',
        plazo: '',
      },
    },
  });

  const requestDelete = await request.post('/api/conversation', {
    data: { message: 'borra tarea Eliminar prueba conversacional' },
  });
  const deleteBody = await requestDelete.json();
  expect(deleteBody.reply).toMatch(/necesito confirmacion/i);

  const confirmDelete = await request.post('/api/conversation', {
    data: { message: 'Confirmar borrado', pendingAction: deleteBody.pendingAction },
  });
  const confirmBody = await confirmDelete.json();
  expect(confirmBody.reply).toMatch(/borre "Eliminar prueba conversacional"/i);

  await page.goto('/?view=inbox');
  await expect(page.getByText('Eliminar prueba conversacional')).toHaveCount(0);
});

test('filters projects and opens a fixture project detail', async ({ page }) => {
  await page.goto('/?view=projects');

  await page.getByPlaceholder(/Buscar proyectos/i).fill('usuarios');
  await expect(page).toHaveURL(/q=usuarios/);
  await expect(page.getByRole('heading', { name: 'Investigacion de usuarios' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lanzamiento del producto' })).toHaveCount(0);

  await page.goto('/?view=projects');
  await page.waitForTimeout(400);
  await page.getByRole('link', { name: 'Lanzamiento del producto' }).click();

  await expect(page).toHaveURL(/\/projects\/e2e-project-launch/);
  await expect(page.getByRole('heading', { level: 1, name: 'Lanzamiento del producto' })).toBeVisible();
  await expect(page.getByText('Preparar notas de lanzamiento')).toBeVisible();
  await expect(page.getByText('Revisar feedback inicial')).toBeVisible();
});

test('creates a project against mutable e2e fixtures', async ({ page }) => {
  await page.goto('/?view=projects');

  await page.getByPlaceholder(/T.tulo del proyecto/i).fill('Proyecto creado en E2E');
  await page.getByPlaceholder(/Descripci.n breve/i).fill('Validacion con fixtures mutables');
  await page.getByLabel(/Secci.n/).selectOption('Largo');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Proyecto creado en E2E' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Proyecto creado en E2E' })).toBeVisible();
});

test('creates a project in the Tareas board section', async ({ page }) => {
  await page.goto('/?view=projects');

  await page.getByPlaceholder(/T.tulo del proyecto/i).fill('Trabajo suelto en E2E');
  await page.getByPlaceholder(/Descripci.n breve/i).fill('Validacion de la seccion Tareas');
  await page.getByRole('combobox').selectOption('Tareas');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();

  const tasksSection = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Tareas', exact: true }) })
    .filter({ hasText: 'Trabajo suelto en E2E' })
    .first();

  await expect(tasksSection.getByRole('heading', { name: 'Trabajo suelto en E2E' })).toBeVisible();
});

test('creates an unassigned task from home voice dictation', async ({ page }) => {
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

  await page.goto('/');

  await page.getByRole('button', { name: 'Grabar tarea' }).click();
  await expect(page.getByRole('status')).toHaveText('Grabando...');
  await page.getByRole('button', { name: /Detener grabaci/ }).click();
  await expect(page.getByRole('textbox', { name: 'Texto dictado' })).toHaveValue('Llamar al proveedor');
  await page.getByRole('button', { name: 'Crear tarea' }).click();

  await expect(page.getByRole('heading', { name: 'Sin fecha' })).toBeVisible();
  await expect(page.getByText('Llamar al proveedor')).toBeVisible();

  await page.getByRole('link', { name: /Inbox/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  await expect(page.getByText('Llamar al proveedor')).toBeVisible();
});

test('moves a project from the touch long-press selector', async ({ page }) => {
  await page.goto('/?view=projects');

  const projectCard = page.getByTestId('project-card-e2e-project-launch');
  await projectCard.dispatchEvent('pointerdown', {
    pointerType: 'touch',
    pointerId: 1,
    isPrimary: true,
    button: 0,
    buttons: 1,
  });
  await page.waitForTimeout(650);
  await projectCard.dispatchEvent('pointerup', {
    pointerType: 'touch',
    pointerId: 1,
    isPrimary: true,
    button: 0,
    buttons: 0,
  });

  const moveDialog = page.getByRole('dialog', { name: 'Mover proyecto' });
  await expect(moveDialog).toBeVisible();
  await moveDialog.getByRole('button', { name: 'Tareas' }).click();

  await expect(
    page.getByTestId('project-section-Tareas').getByRole('heading', { name: 'Lanzamiento del producto' }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByTestId('project-section-Tareas').getByRole('heading', { name: 'Lanzamiento del producto' }),
  ).toBeVisible();
});

test('uses a mobile project list instead of the desktop board', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('link', { name: /Proyectos/ }).first().click();
  await expect(page.getByTestId('project-list-card-e2e-project-launch')).toBeVisible();
  await expect(page.getByTestId('project-card-e2e-project-launch')).toBeHidden();
});

test('assigns an inbox task and removes it from Inbox', async ({ page, request }) => {
  await request.post('/api/e2e', {
    data: {
      action: 'createTask',
      task: {
        title: 'Ordenar tarea del inbox',
        description: 'Debe pasar a un proyecto existente',
        is_completed: false,
        project: '',
        realization_at: '',
        due_at: '',
        plazo: '',
      },
    },
  });

  await page.goto('/?view=inbox');
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  await expect(page.getByText('Ordenar tarea del inbox')).toBeVisible();
  await page.getByRole('combobox', { name: 'Proyecto para Ordenar tarea del inbox' }).selectOption('e2e-project-launch');
  await page.getByRole('button', { name: 'Asignar' }).click();
  await expect(page.getByText('Ordenar tarea del inbox')).toHaveCount(0);

  await page.goto('/projects/e2e-project-launch');
  await expect(page.getByText('Ordenar tarea del inbox')).toBeVisible();
});

test('groups due-today work in the Today view', async ({ page, request }) => {
  const dueToday = new Date().toISOString().replace('T', ' ');

  await request.post('/api/e2e', {
    data: {
      action: 'createTask',
      task: {
        title: 'Revisar vencimiento de hoy',
        description: '',
        is_completed: false,
        project: 'e2e-project-launch',
        realization_at: '',
        due_at: dueToday,
        plazo: 'Corto',
      },
    },
  });

  await page.goto('/');
  const todaySection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Para hoy' }) });
  await expect(todaySection.getByText('Revisar vencimiento de hoy')).toBeVisible();
});

test('creates and completes a task against mutable e2e fixtures', async ({ page }) => {
  await page.goto('/projects/e2e-project-launch');

  await page.getByPlaceholder(/nueva tarea/i).fill('Tarea creada en E2E');
  await page.getByRole('textbox', { name: 'Descripcion de la tarea' }).fill('Detalle visible en la tarea');
  await page.getByLabel('Realizacion').fill('2026-05-13T10:30');
  await page.getByLabel('Vencimiento').fill('2026-05-14T18:00');
  await page.getByLabel('Plazo').selectOption('Corto');
  await page.getByRole('button', { name: 'Agregar Tarea' }).click();
  await expect(page.getByText('Tarea creada en E2E')).toBeVisible();
  await expect(page.getByText('Detalle visible en la tarea')).toBeVisible();
  await expect(page.getByText('Plazo: Corto')).toBeVisible();
  await expect(page.getByText(/Realizacion:/)).toBeVisible();
  await expect(page.getByText(/Vence:/)).toBeVisible();

  await page.locator('input[type="checkbox"]').last().check();
  await expect(page.locator('input[type="checkbox"]').last()).toBeChecked();

  await page.reload();
  await expect(page.getByText('Tarea creada en E2E')).toBeVisible();
  await expect(page.getByText('Detalle visible en la tarea')).toBeVisible();
  await expect(page.getByText('Plazo: Corto')).toBeVisible();
  await expect(page.locator('input[type="checkbox"]').last()).toBeChecked();
});

test('edits and deletes a project against mutable e2e fixtures', async ({ page }) => {
  await page.goto('/projects/e2e-project-launch');

  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByPlaceholder(/T.tulo del proyecto/i).fill('Proyecto editado en E2E');
  await page.getByPlaceholder(/Descripci.n del proyecto/i).fill('Descripcion actualizada por Playwright');
  await page.getByLabel(/Secci.n/).selectOption('Largo');
  await page.getByRole('button', { name: 'Guardar Cambios' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Proyecto editado en E2E' })).toBeVisible();
  await expect(page.getByText(/Secci.n: Largo/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyecto editado en E2E' })).toBeVisible();
  await expect(page.getByText('Descripcion actualizada por Playwright')).toBeVisible();

  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  const projectDeleteDialog = page.getByRole('dialog', { name: 'Eliminar proyecto' });
  await expect(projectDeleteDialog).toBeVisible();
  await projectDeleteDialog.getByRole('button', { name: 'Eliminar proyecto' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('a[href="/projects/e2e-project-launch"]')).toHaveCount(0);
});

test('edits and deletes a task against mutable e2e fixtures', async ({ page }) => {
  await page.goto('/projects/e2e-project-launch');

  await page.getByRole('button', { name: 'Abrir detalles de Preparar notas de lanzamiento' }).click();
  const detailDialog = page.getByRole('dialog', { name: 'Detalle de tarea' });
  await expect(detailDialog).toBeVisible();
  await detailDialog.getByRole('textbox', { name: /T.tulo de tarea/i }).fill('Notas editadas en E2E');
  await detailDialog.getByRole('textbox', { name: /Descripcion de tarea/i }).fill('Detalle editado desde el inspector');
  await detailDialog.getByLabel('Vencimiento').fill('2026-05-15T11:00');
  await detailDialog.getByLabel('Plazo').selectOption('Mediano');
  await detailDialog.getByRole('button', { name: 'Guardar tarea' }).click();

  await expect(page.getByText('Notas editadas en E2E')).toBeVisible();
  await expect(page.getByText('Detalle editado desde el inspector')).toBeVisible();
  await expect(page.getByText('Plazo: Mediano')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Notas editadas en E2E')).toBeVisible();
  await expect(page.getByText('Detalle editado desde el inspector')).toBeVisible();

  await page.getByText('Notas editadas en E2E').hover();
  await page.getByRole('button', { name: 'Eliminar tarea' }).first().click();
  const taskDeleteDialog = page.getByRole('dialog', { name: 'Eliminar tarea' });
  await expect(taskDeleteDialog).toBeVisible();
  await taskDeleteDialog.getByRole('button', { name: 'Eliminar tarea' }).click();

  await expect(page.getByText('Notas editadas en E2E')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('Notas editadas en E2E')).toHaveCount(0);
});
