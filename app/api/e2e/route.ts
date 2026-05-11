import {
  createE2EProject,
  createE2ETask,
  deleteE2EProject,
  deleteE2ETask,
  resetE2EStore,
  updateE2EProject,
  updateE2EProjectOrder,
  updateE2ETask,
} from '@/lib/e2eStore';

function assertE2EMode() {
  if (process.env.NEXT_PUBLIC_E2E_MOCKS !== '1') {
    return Response.json({ error: 'E2E mocks are disabled.' }, { status: 404 });
  }

  return null;
}

export async function POST(request: Request) {
  const disabledResponse = assertE2EMode();
  if (disabledResponse) return disabledResponse;

  const body = await request.json();

  switch (body.action) {
    case 'reset':
      resetE2EStore();
      return Response.json({ ok: true });
    case 'createProject':
      return Response.json(createE2EProject(body.project));
    case 'updateProject':
      return Response.json(updateE2EProject(body.project));
    case 'deleteProject':
      deleteE2EProject(body.projectId);
      return Response.json({ ok: true });
    case 'updateProjectOrder':
      updateE2EProjectOrder(body.projects);
      return Response.json({ ok: true });
    case 'createTask':
      return Response.json(createE2ETask(body.task));
    case 'updateTask':
      return Response.json(updateE2ETask(body.task));
    case 'deleteTask':
      deleteE2ETask(body.taskId);
      return Response.json({ ok: true });
    default:
      return Response.json({ error: 'Unknown E2E action.' }, { status: 400 });
  }
}
