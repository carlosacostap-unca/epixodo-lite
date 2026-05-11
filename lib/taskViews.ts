import type { Task } from '@/types';

export type TodayTaskGroups = {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  unscheduled: Task[];
};

function parseTaskDate(value: string) {
  if (!value) return null;

  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function startOfLocalDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfLocalDay(date: Date) {
  const value = startOfLocalDay(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function isSameLocalDay(value: Date, day: Date) {
  return value >= startOfLocalDay(day) && value <= endOfLocalDay(day);
}

function getScheduleDate(task: Task) {
  return parseTaskDate(task.due_at) || parseTaskDate(task.realization_at);
}

function byScheduleDate(a: Task, b: Task) {
  const left = getScheduleDate(a)?.getTime() || Number.POSITIVE_INFINITY;
  const right = getScheduleDate(b)?.getTime() || Number.POSITIVE_INFINITY;
  return left - right || a.created.localeCompare(b.created);
}

export function groupTodayTasks(tasks: Task[], now = new Date()): TodayTaskGroups {
  const start = startOfLocalDay(now);
  const end = endOfLocalDay(now);
  const groups: TodayTaskGroups = {
    overdue: [],
    today: [],
    upcoming: [],
    unscheduled: [],
  };

  for (const task of tasks) {
    if (task.is_completed) continue;

    const dueAt = parseTaskDate(task.due_at);
    const realizationAt = parseTaskDate(task.realization_at);
    const scheduleAt = dueAt || realizationAt;

    if (dueAt && dueAt < start) {
      groups.overdue.push(task);
    } else if ((dueAt && isSameLocalDay(dueAt, now)) || (!dueAt && realizationAt && isSameLocalDay(realizationAt, now))) {
      groups.today.push(task);
    } else if (scheduleAt && scheduleAt > end) {
      groups.upcoming.push(task);
    } else if (!scheduleAt) {
      groups.unscheduled.push(task);
    }
  }

  return {
    overdue: groups.overdue.sort(byScheduleDate),
    today: groups.today.sort(byScheduleDate),
    upcoming: groups.upcoming.sort(byScheduleDate),
    unscheduled: groups.unscheduled.sort((a, b) => a.created.localeCompare(b.created)),
  };
}
