export interface Project {
  id: string;
  title: string;
  description: string;
  plazo: 'Corto' | 'Mediano' | 'Largo' | 'Tareas' | '';
  order?: number;
  created: string;
  updated: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
  project: string; // Relacion con Project.id
  realization_at: string;
  due_at: string;
  plazo: 'Corto' | 'Mediano' | 'Largo' | '';
  created: string;
  updated: string;
}
