import { getOrCreateE2EUnassignedProject } from '@/lib/e2eStore';
import { pb } from '@/lib/pocketbase';
import {
  UNASSIGNED_TASKS_PROJECT_DESCRIPTION,
  UNASSIGNED_TASKS_PROJECT_TITLE,
} from '@/lib/unassignedTasks';
import type { Project } from '@/types';

const useE2EFixtures = process.env.NEXT_PUBLIC_E2E_MOCKS === '1';

export async function findUnassignedTasksProject() {
  if (useE2EFixtures) {
    return getOrCreateE2EUnassignedProject();
  }

  try {
    return await pb.collection('projects').getFirstListItem<Project>(`description = "${UNASSIGNED_TASKS_PROJECT_DESCRIPTION}"`);
  } catch {
    return null;
  }
}

export async function getOrCreateUnassignedTasksProject() {
  if (useE2EFixtures) {
    return getOrCreateE2EUnassignedProject();
  }

  try {
    return await pb.collection('projects').getFirstListItem<Project>(`description = "${UNASSIGNED_TASKS_PROJECT_DESCRIPTION}"`);
  } catch {
    return pb.collection('projects').create<Project>({
      title: UNASSIGNED_TASKS_PROJECT_TITLE,
      description: UNASSIGNED_TASKS_PROJECT_DESCRIPTION,
      plazo: '',
    });
  }
}
