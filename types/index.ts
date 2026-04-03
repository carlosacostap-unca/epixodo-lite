export interface Project {
  id: string;
  title: string;
  description: string;
  plazo: 'Corto' | 'Mediano' | 'Largo' | '';
  order?: number;
  created: string;
  updated: string;
}

export interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  project: string; // Relación con Project.id
  created: string;
  updated: string;
}
