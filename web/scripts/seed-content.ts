import { config as loadEnv } from 'dotenv';
import { getPayload } from 'payload';

// Как scripts/seed.ts: env до payload.config, запуск нативным Node 24 (не tsx).
loadEnv({ path: '.env.local' });
loadEnv();

async function upsertLegal(payload: any, slug: string, data: Record<string, unknown>) {
  const found = await payload.find({ collection: 'legal-articles', where: { slug: { equals: slug } }, limit: 1 });
  if (found.docs.length) {
    await payload.update({ collection: 'legal-articles', id: found.docs[0].id, data });
    console.log(`[seed] updated legal: ${slug}`);
  } else {
    await payload.create({ collection: 'legal-articles', data: { slug, ...data } });
    console.log(`[seed] created legal: ${slug}`);
  }
}

async function main() {
  const { default: config } = await import('../payload.config.ts');
  const payload = await getPayload({ config });

  await upsertLegal(payload, 'municipal-intake-rights', {
    title: 'Что делать, если ваше животное попало в службу отлова',
    category: 'lost_pet',
    excerpt: 'Пошаговая инструкция: куда звонить, какие документы взять, сроки востребования и как доказать собственность.',
    body: {
      root: {
        type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
        children: [
          { type: 'heading', tag: 'h2', version: 1, children: [{ type: 'text', text: 'Действуйте быстро', version: 1 }] },
          { type: 'paragraph', version: 1, children: [{ type: 'text', text: 'У служб отлова есть ограниченный срок содержания безнадзорных животных. Чем раньше вы обратитесь, тем выше шанс забрать питомца.', version: 1 }] },
          { type: 'heading', tag: 'h2', version: 1, children: [{ type: 'text', text: 'Шаги', version: 1 }] },
          { type: 'paragraph', version: 1, children: [{ type: 'text', text: '1. Позвоните в местную службу отлова и ЖКХ, уточните, есть ли ваше животное. 2. Возьмите документы, подтверждающие собственность: ветпаспорт, договор/чек, фото с питомцем, данные о чипе. 3. Уточните срок содержания и условия выдачи. 4. Приезжайте лично с документами.', version: 1 }] },
          { type: 'heading', tag: 'h2', version: 1, children: [{ type: 'text', text: 'Как доказать, что животное ваше', version: 1 }] },
          { type: 'paragraph', version: 1, children: [{ type: 'text', text: 'Лучшее доказательство — микрочип (15 цифр), зарегистрированный на вас. Также помогают ветпаспорт с отметками, фотографии и свидетели.', version: 1 }] },
        ],
      },
    },
    // Сверено с pravo.by 07.10.2026. Порядок и сроки содержания в пунктах — постановлением Совмина (уточняет юрист).
    npaLinks: [
      { title: 'Закон Республики Беларусь от 01.04.2024 № 361-З «Об ответственном обращении с животными»', url: 'https://pravo.by/document/?guid=12551&p0=H12400361' },
    ],
  });

  console.log('[seed] content done');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
