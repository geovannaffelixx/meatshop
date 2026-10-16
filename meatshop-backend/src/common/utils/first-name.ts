export function firstName(value: string | null | undefined): string {
  return value?.trim().split(/\s+/u)[0] || 'Cliente';
}
