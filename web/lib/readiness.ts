export function pendingMigrations(expected: string[], applied: string[]): string[] {
  const done = new Set(applied);
  return expected.filter((name) => !done.has(name));
}
