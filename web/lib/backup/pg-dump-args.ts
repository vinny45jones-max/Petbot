// Пароль БД передаём pg_dump через PGPASSWORD, а не в URL аргумента: argv виден в списке процессов и логах.
export function pgDumpInvocation(databaseUrl: string): { args: string[]; env: Record<string, string> } {
  const url = new URL(databaseUrl);
  const password = decodeURIComponent(url.password);
  url.password = '';
  return { args: ['--no-owner', '--no-acl', url.toString()], env: password ? { PGPASSWORD: password } : {} };
}
