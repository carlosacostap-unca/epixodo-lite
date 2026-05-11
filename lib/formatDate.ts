const projectDateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatProjectDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return projectDateFormatter.format(date);
}
