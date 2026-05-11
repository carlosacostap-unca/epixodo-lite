export function dateTimeInputToPocketDate(value: string) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().replace('T', ' ');
}

export function pocketDateToDateInput(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function pocketDateToDateTimeInput(value?: string) {
  if (!value) return '';

  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function formatPocketDate(value?: string) {
  if (!value) return '';

  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
  })
    .format(date)
    .replace(/[\u00a0\u202f]/g, ' ');
}

export function formatPocketDateTime(value?: string) {
  if (!value) return '';

  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
    .format(date)
    .replace(/[\u00a0\u202f]/g, ' ');
}
