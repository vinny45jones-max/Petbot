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

  const glossary = [
    { slug: 'sterilization', term: 'Стерилизация', definition: 'Операция, после которой животное не может иметь потомство. Снижает число бездомных животных и полезна для здоровья.' },
    { slug: 'chipping', term: 'Чипирование', definition: 'Под кожу вживляется микрочип с 15-значным номером. По нему можно найти владельца потерянного животного.' },
    { slug: 'foster', term: 'Передержка', definition: 'Временное содержание животного дома у волонтёра, пока ищут постоянного хозяина.' },
    { slug: 'guardianship', term: 'Опека', definition: 'Финансовая или организационная помощь конкретному животному без его забора домой.' },
  ];
  for (const g of glossary) {
    const f = await payload.find({ collection: 'glossary-terms', where: { slug: { equals: g.slug } }, limit: 1 });
    if (!f.docs.length) { await payload.create({ collection: 'glossary-terms', data: g }); console.log(`[seed] glossary: ${g.slug}`); }
  }

  const faqs = [
    { slug: 'faq-how-to-post', category: 'faq' as const, title: 'Как разместить животное?', order: 1,
      answer: 'Войдите на сайт и нажмите «Разместить животное» в личном кабинете, заполните анкету и добавьте фото. Объявление частного лица появится в каталоге после проверки модератором (обычно до 24 часов). Приюты публикуют без проверки.' },
    { slug: 'faq-is-it-free', category: 'faq' as const, title: 'Это бесплатно?', order: 2,
      answer: 'Да. Размещать животных, искать питомца и связываться с приютами можно бесплатно. Для приютов подключение тоже бесплатно.' },
    { slug: 'faq-how-adopt', category: 'faq' as const, title: 'Как взять животное домой?', order: 3,
      answer: 'Откройте карточку животного и нажмите «Хочу взять домой». Заявка уйдёт приюту или хозяину — они свяжутся с вами по телефону или в Telegram.' },
  ];
  for (const { answer, ...a } of faqs) {
    const f = await payload.find({ collection: 'help-articles', where: { slug: { equals: a.slug } }, limit: 1 });
    if (!f.docs.length) {
      await payload.create({ collection: 'help-articles', data: {
        ...a,
        body: { root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: [
          { type: 'paragraph', version: 1, children: [{ type: 'text', text: answer, version: 1 }] },
        ] } },
      } });
      console.log(`[seed] faq: ${a.slug}`);
    }
  }

  // --- Заглушки разделов: стартовые тексты, чтобы страницы не были пустыми. Редактируются в админке. ---
  const rich = (paragraphs: string[]) => ({ root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children:
    paragraphs.map((text) => ({ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] })) } }) as any;
  const NOTE = 'Раздел дополняется: это стартовая версия текста.';

  const helpStubs = [
    { slug: 'how-find-pet', category: 'how_it_works' as const, order: 1, title: 'Ищу питомца', body: [
      'Откройте каталог «Животные», выберите город, вид и возраст. Животные из служб отлова, у которых истекает срок содержания, показаны первыми и отмечены красной меткой «Срочно».',
      'В карточке нажмите «Хочу взять домой» — заявка уйдёт приюту, волонтёру или хозяину, и с вами свяжутся по телефону или в Telegram.',
      NOTE,
    ] },
    { slug: 'how-post-animal', category: 'how_it_works' as const, order: 2, title: 'Хочу пристроить животное', body: [
      'Войдите на сайт, нажмите «Разместить животное», добавьте фото и заполните короткую анкету: вид, город, описание, контакт.',
      'Объявление проверяет модератор. После проверки оно появляется в каталоге, а вам приходит письмо.',
      NOTE,
    ] },
    { slug: 'how-shelter-joins', category: 'how_it_works' as const, order: 3, title: 'Я представляю приют или волонтёрскую группу', body: [
      'Оставьте заявку на странице «Контакты». После проверки организация получает кабинет: свои объявления, заявки на усыновление, профиль с отметкой «Проверено».',
      'Подключение бесплатно.',
      NOTE,
    ] },
    { slug: 'safety-meeting', category: 'safety' as const, order: 1, title: 'Как безопасно встретиться и забрать животное', body: [
      'Встречайтесь в людном месте или в приюте, по возможности не в одиночку. Попросите показать животное до принятия решения.',
      'Спросите про прививки, стерилизацию и чип, попросите ветеринарный паспорт, если он есть. В первые дни покажите животное ветеринару.',
      NOTE,
    ] },
    { slug: 'safety-fraud', category: 'safety' as const, order: 2, title: 'Как распознать мошенников', body: [
      'Не переводите предоплату за «доставку», «бронь» или «прививки» незнакомым людям. Пристройство животного через сайт не требует платы.',
      'Насторожитесь, если вас торопят, отказываются показать животное или просят данные банковской карты. О подозрительном объявлении сообщите через форму на странице «Контакты».',
      NOTE,
    ] },
    { slug: 'guide-account', category: 'guide' as const, order: 1, title: 'Регистрация и вход', body: [
      'Зарегистрироваться можно по электронной почте: после регистрации придёт письмо со ссылкой для подтверждения адреса.',
      'В личном кабинете собраны ваши объявления и заявки на усыновление. Там же можно выгрузить или удалить свои данные.',
      NOTE,
    ] },
    { slug: 'guide-urgent', category: 'guide' as const, order: 2, title: 'Что значит метка «Срочно»', body: [
      'Так отмечены животные из служб отлова, у которых до конца срока содержания осталось три дня или меньше. Срок считается от даты поступления животного в службу.',
      'Если можете забрать такое животное — нажмите «Забрать из службы отлова» в карточке. Если не можете — поделитесь ссылкой: это тоже помогает.',
      NOTE,
    ] },
    { slug: 'guide-report', category: 'guide' as const, order: 3, title: 'Как пожаловаться на объявление или комментарий', body: [
      'Под каждым комментарием есть кнопка «Пожаловаться». О жестоком обращении с животными можно сообщить на отдельной странице «Сообщить о жестокости» — в том числе анонимно.',
      NOTE,
    ] },
  ];
  for (const { body, ...a } of helpStubs) {
    const f = await payload.find({ collection: 'help-articles', where: { slug: { equals: a.slug } }, limit: 1 });
    if (!f.docs.length) {
      await payload.create({ collection: 'help-articles', data: { ...a, body: rich(body) } });
      console.log(`[seed] help: ${a.slug}`);
    }
  }

  const blogStubs = [
    { slug: 'zapusk-proekta', category: 'news' as const, title: 'Проект запускается',
      excerpt: 'Собираем в одном месте животных Беларуси, которым нужен дом, — и в первую очередь тех, у кого мало времени.',
      body: [
        'Мы запускаем сайт, где приюты, волонтёры и обычные люди могут разместить животное, а будущие хозяева — найти питомца в своём городе.',
        'Главная задача проекта — чтобы животные из служб отлова успевали найти дом до окончания срока содержания. Поэтому такие объявления всегда показаны первыми.',
        'Сайт работает в тестовом режиме. Если вы представляете приют или волонтёрскую группу — напишите нам через страницу «Контакты».',
      ] },
    { slug: 'kak-podgotovit-dom', category: 'tips' as const, title: 'Как подготовить дом к новому питомцу',
      excerpt: 'Короткий список того, что стоит сделать до дня, когда животное переедет к вам.',
      body: [
        'Подготовьте место для сна, миски, корм, которым животное кормили раньше, и лоток или поводок с адресником.',
        'Уберите провода, мелкие предметы и ядовитые для животных растения. Проверьте, что окна и балкон закрыты сеткой.',
        'Первые дни дайте питомцу привыкнуть: не зовите гостей и не меняйте резко корм. Запишитесь к ветеринару на осмотр.',
        NOTE,
      ] },
    { slug: 'istorii-uspeha-skoro', category: 'success_story' as const, title: 'Здесь появятся истории тех, кто нашёл дом',
      excerpt: 'Раздел пока пуст: проект только начал работу. Первые истории опубликуем, как только животные с сайта переедут к новым хозяевам.',
      body: [
        'Проект только начал работу, поэтому настоящих историй пока нет — выдумывать их мы не будем.',
        'Если вы взяли животное через сайт и хотите рассказать об этом — напишите нам через страницу «Контакты».',
      ] },
  ];
  for (const { body, ...p } of blogStubs) {
    const f = await payload.find({ collection: 'blog-posts', where: { slug: { equals: p.slug } }, limit: 1 });
    if (!f.docs.length) {
      await payload.create({ collection: 'blog-posts', data: { ...p, body: rich(body), status: 'published' } });
      console.log(`[seed] blog: ${p.slug}`);
    }
  }

  console.log('[seed] content done');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
