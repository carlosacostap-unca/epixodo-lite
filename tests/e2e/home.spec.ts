import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/e2e', {
    data: { action: 'reset' },
  });
});

test('loads the project board home page from e2e fixtures', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Epixodo Lite/);
  await expect(page.getByRole('heading', { level: 1, name: /Proyectos/i })).toBeVisible();
  await expect(page.getByPlaceholder(/Buscar proyectos/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lanzamiento del producto' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tareas', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bandeja de tareas' })).toBeVisible();
});

test('filters projects and opens a fixture project detail', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder(/Buscar proyectos/i).fill('usuarios');
  await expect(page).toHaveURL(/q=usuarios/);
  await expect(page.getByRole('heading', { name: 'Investigacion de usuarios' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lanzamiento del producto' })).toHaveCount(0);

  await page.goto('/');
  await page.waitForTimeout(400);
  await page.locator('a[href="/projects/e2e-project-launch"]').click();

  await expect(page).toHaveURL(/\/projects\/e2e-project-launch/);
  await expect(page.getByRole('heading', { level: 1, name: 'Lanzamiento del producto' })).toBeVisible();
  await expect(page.getByText('Preparar notas de lanzamiento')).toBeVisible();
  await expect(page.getByText('Revisar feedback inicial')).toBeVisible();
});

test('creates a project against mutable e2e fixtures', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder(/T.tulo del proyecto/i).fill('Proyecto creado en E2E');
  await page.getByPlaceholder(/Descripci.n breve/i).fill('Validacion con fixtures mutables');
  await page.getByRole('combobox').selectOption('Largo');
  await page.getByRole('button', { name: 'Crear' }).click();

  await expect(page.getByRole('heading', { name: 'Proyecto creado en E2E' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Proyecto creado en E2E' })).toBeVisible();
});

test('creates a project in the Tareas board section', async ({ page }) => {
  await page.goto('/');

  await page.getByPlaceholder(/T.tulo del proyecto/i).fill('Trabajo suelto en E2E');
  await page.getByPlaceholder(/Descripci.n breve/i).fill('Validacion de la seccion Tareas');
  await page.getByRole('combobox').selectOption('Tareas');
  await page.getByRole('button', { name: 'Crear' }).click();

  const tasksSection = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Tareas', exact: true }) })
    .filter({ hasText: 'Trabajo suelto en E2E' })
    .first();

  await expect(tasksSection.getByRole('heading', { name: 'Trabajo suelto en E2E' })).toBeVisible();
});

test('moves a project from the touch long-press selector', async ({ page }) => {
  await page.goto('/');

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

test('creates and completes a task against mutable e2e fixtures', async ({ page }) => {
  await page.goto('/projects/e2e-project-launch');

  await page.getByPlaceholder(/nueva tarea/i).fill('Tarea creada en E2E');
  await page.getByRole('button', { name: 'Agregar Tarea' }).click();
  await expect(page.getByText('Tarea creada en E2E')).toBeVisible();

  await page.locator('input[type="checkbox"]').last().check();
  await expect(page.locator('input[type="checkbox"]').last()).toBeChecked();

  await page.reload();
  await expect(page.getByText('Tarea creada en E2E')).toBeVisible();
  await expect(page.locator('input[type="checkbox"]').last()).toBeChecked();
});

test('edits and deletes a project against mutable e2e fixtures', async ({ page }) => {
  await page.goto('/projects/e2e-project-launch');

  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByPlaceholder(/T.tulo del proyecto/i).fill('Proyecto editado en E2E');
  await page.getByPlaceholder(/Descripci.n del proyecto/i).fill('Descripcion actualizada por Playwright');
  await page.getByRole('combobox').selectOption('Largo');
  await page.getByRole('button', { name: 'Guardar Cambios' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Proyecto editado en E2E' })).toBeVisible();
  await expect(page.getByText('Sección: Largo')).toBeVisible();

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

  await page.getByText('Preparar notas de lanzamiento').hover();
  await page.getByRole('button', { name: 'Editar tarea' }).first().click();
  await page.getByRole('textbox', { name: /T.tulo de tarea/i }).fill('Notas editadas en E2E');
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByText('Notas editadas en E2E')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Notas editadas en E2E')).toBeVisible();

  await page.getByText('Notas editadas en E2E').hover();
  await page.getByRole('button', { name: 'Eliminar tarea' }).first().click();
  const taskDeleteDialog = page.getByRole('dialog', { name: 'Eliminar tarea' });
  await expect(taskDeleteDialog).toBeVisible();
  await taskDeleteDialog.getByRole('button', { name: 'Eliminar tarea' }).click();

  await expect(page.getByText('Notas editadas en E2E')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('Notas editadas en E2E')).toHaveCount(0);
});
