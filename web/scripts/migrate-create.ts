// `npm run migrate:create -- <имя> [флаги]`: payload migrate:create, затем типы из @payloadcms/db-postgres
// переписываются на `import { type ... }` — иначе под --disable-transpile миграция падает «does not provide an export».
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const r = spawnSync('npx', ['payload', 'migrate:create', '--disable-transpile', ...process.argv.slice(2)], { stdio: 'inherit', shell: true });
if (r.status !== 0) process.exit(r.status ?? 1);

const dir = join(import.meta.dirname, '..', 'migrations');
for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts') && n !== 'index.ts')) {
  const p = join(dir, f);
  const src = readFileSync(p, 'utf8');
  const out = src.replace(/import \{ MigrateUpArgs, MigrateDownArgs, sql \}/, 'import { type MigrateUpArgs, type MigrateDownArgs, sql }');
  if (out !== src) {
    writeFileSync(p, out);
    console.log(`[migrate:create] type-импорт исправлен: ${f}`);
  }
}
