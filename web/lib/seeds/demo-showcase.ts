// Демо-наполнение витрины (приюты, животные с фото). Все организации вымышленные.
// Заливка: `npm run seed:demo`, удаление: `npm run seed:demo -- --remove`. Фото — seed-assets/demo/.

export const DEMO_EMAIL_DOMAIN = 'demo.pethelp.invalid';

export interface ShowcaseOrg {
  key: string;
  name: string;
  cityName: string;
  address: string;
  phone: string;
  cover: string; // имя файла без префикса demo- и расширения
  about: string[];
}

export interface ShowcaseAnimal {
  photo: string;
  name?: string;
  species: 'dog' | 'cat';
  sex: 'male' | 'female' | 'unknown';
  ageYears?: number;
  ageMonths?: number;
  size: 'small' | 'medium' | 'large';
  cityName: string;
  org: string;                 // key организации-владельца
  facilityName?: string;       // служба отлова
  intakeOffsetDays?: number;   // сколько дней назад попал в службу (срок содержания — 5 дней)
  healthStatus?: 'healthy' | 'needs_treatment' | 'chronic_condition' | 'recovering';
  isSterilized?: boolean;
  isVaccinated?: boolean;
  specialStatus?: ('reserved' | 'needs_temp_home' | 'quarantine')[];
  lostOrFound?: 'found' | 'lost';
  publishedDaysAgo: number;
  about: string[];
}

export const showcaseOrgs: ShowcaseOrg[] = [
  { key: 'ruki', name: 'Приют «Добрые руки»', cityName: 'Минск', address: 'ул. Садовая, 12', phone: '+375290000001', cover: 'greta', about: [
    'Частный приют для собак и кошек. Работаем с 2016 года, одновременно у нас живёт около шестидесяти животных.',
    'Каждое животное проходит осмотр у ветеринара, обработку от паразитов и вакцинацию. Взрослых стерилизуем до передачи в семью.',
    'Приехать познакомиться можно в выходные с 11:00 до 16:00 — позвоните заранее, чтобы волонтёр вас встретил.',
  ] },
  { key: 'lapa', name: 'Фонд «Лапа в ладони»', cityName: 'Гомель', address: 'ул. Речная, 5', phone: '+375290000002', cover: 'barni', about: [
    'Фонд помогает бездомным животным Гомеля и области: лечим, стерилизуем, ищем дом.',
    'Своего здания у фонда нет — животные живут на передержках у волонтёров, поэтому мы хорошо знаем характер каждого.',
    'Ищем не только хозяев, но и временные передержки: корм и ветеринарные расходы фонд берёт на себя.',
  ] },
  { key: 'okno', name: 'Кошачий приют «Тёплый подоконник»', cityName: 'Брест', address: 'ул. Вишнёвая, 8', phone: '+375290000003', cover: 'snezhka', about: [
    'Небольшой домашний приют только для кошек. Берём животных с улицы и из служб отлова, выхаживаем и социализируем.',
    'Все взрослые кошки стерилизованы, привиты и приучены к лотку. Котят отдаём с договором о стерилизации.',
  ] },
  { key: 'hvost', name: 'Волонтёрская группа «Хвост трубой»', cityName: 'Гродно', address: 'встречи по договорённости', phone: '+375290000004', cover: 'markiza', about: [
    'Группа из двенадцати волонтёров. Забираем животных из службы отлова до окончания срока содержания и ищем им семьи.',
    'После передачи остаёмся на связи: подскажем по адаптации, корму и ветеринарам.',
  ] },
  { key: 'vernost', name: 'Приют «Верность»', cityName: 'Витебск', address: 'ул. Полевая, 21', phone: '+375290000005', cover: 'shtorm', about: [
    'Приют при ветеринарной клинике. Принимаем животных после травм и операций, ставим на лапы и пристраиваем.',
    'Особенно ждём тех, кто готов взять взрослую или пожилую собаку: они спокойнее щенков и очень привязываются к человеку.',
  ] },
];

const FAUNA = 'ГУ «Фауна города» (Минск, Гурского 47)';

export const showcaseAnimals: ShowcaseAnimal[] = [
  // --- служба отлова: срок содержания истекает ---
  { photo: 'greta', name: 'Грета', species: 'dog', sex: 'female', ageYears: 4, size: 'large', cityName: 'Минск', org: 'ruki',
    facilityName: FAUNA, intakeOffsetDays: 3, isVaccinated: false, publishedDaysAgo: 0, about: [
      'Немецкая овчарка, найдена у гаражей в Заводском районе. В ошейнике, но без адресника и чипа — похоже, домашняя и потерялась.',
      'Знает команды «сидеть» и «рядом», спокойно даёт себя осмотреть, на людей не бросается. С другими собаками держится настороженно.',
      'Срок содержания в службе отлова заканчивается через два дня. Нужен хозяин или хотя бы временная передержка.',
    ] },
  { photo: 'ais', name: 'Айс', species: 'dog', sex: 'male', ageMonths: 4, size: 'medium', cityName: 'Могилёв', org: 'ruki',
    facilityName: 'Городская служба отлова (Могилёв)', intakeOffsetDays: 4, publishedDaysAgo: 1, about: [
      'Щенок-метис хаски с разными отметинами на морде. Привезли в службу отлова вместе с братом — брата уже забрали.',
      'Активный, любопытный, тянется к людям. Вырастет средним или крупным, ему понадобятся долгие прогулки.',
      'Остался один день. Заберите или расскажите о нём тем, кто ищет щенка.',
    ] },
  { photo: 'bagira', name: 'Багира', species: 'cat', sex: 'female', ageYears: 3, size: 'small', cityName: 'Гомель', org: 'lapa',
    facilityName: 'Городская служба отлова (Гомель)', intakeOffsetDays: 2, publishedDaysAgo: 1, about: [
      'Чёрная кошка с жёлтыми глазами. Жила во дворе на улице Советской, жильцы подкармливали, пока не поступила жалоба.',
      'Ручная: идёт на колени, мурчит, когти не выпускает. К лотку приучена — проверили в службе.',
      'До конца срока содержания три дня.',
    ] },
  { photo: 'oskar', name: 'Оскар', species: 'dog', sex: 'male', ageYears: 3, size: 'medium', cityName: 'Гродно', org: 'hvost',
    facilityName: 'Городская служба отлова (Гродно)', intakeOffsetDays: 1, publishedDaysAgo: 2, about: [
      'Чёрно-белый метис бордер-колли. Очень контактный: виляет хвостом каждому, кто подходит к вольеру.',
      'Умный и энергичный, быстро учится. Подойдёт тем, кто любит бегать, ходить в походы или заниматься с собакой.',
    ] },
  { photo: 'mokko', name: 'Мокко', species: 'dog', sex: 'female', ageYears: 5, size: 'large', cityName: 'Брест', org: 'lapa',
    facilityName: 'Городская служба отлова (Брест)', intakeOffsetDays: 0, healthStatus: 'recovering', publishedDaysAgo: 0, about: [
      'Шоколадный лабрадор. Поступила худой, сейчас набирает вес и уже охотно играет.',
      'Ласковая, терпеливая, обожает детей и воду. На поводке идёт спокойно.',
    ] },

  // --- приюты и волонтёры ---
  { photo: 'ryzhik', name: 'Рыжик', species: 'dog', sex: 'male', ageYears: 2, size: 'medium', cityName: 'Минск', org: 'ruki',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 2, about: [
      'Рыжий метис с очень внимательным взглядом. В приют попал щенком, вырос у нас на глазах.',
      'Добродушный и не шумный, ладит с собаками и кошками. Один дома не воет и не грызёт вещи — проверено на передержке.',
      'Кастрирован, привит, обработан от паразитов. Отдаём по договору, первое время будем на связи.',
    ] },
  { photo: 'sprint', name: 'Спринт', species: 'dog', sex: 'male', ageYears: 2, size: 'medium', cityName: 'Минск', org: 'ruki',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 5, about: [
      'Бордер-колли с неиссякаемой батарейкой. Мяч готов носить часами, знает больше десяти команд.',
      'Ему нужен активный хозяин и много движения: бег, аджилити, фрисби. В квартире без нагрузок заскучает.',
    ] },
  { photo: 'toffi', name: 'Тоффи', species: 'dog', sex: 'female', ageYears: 5, size: 'small', cityName: 'Минск', org: 'ruki',
    isSterilized: true, isVaccinated: true, specialStatus: ['needs_temp_home'], publishedDaysAgo: 7, about: [
      'Небольшая чёрно-подпалая собака, метис таксы. Хозяйка уехала и не смогла взять её с собой.',
      'Тихая, любит лежать рядом и спать под пледом. Гуляет два раза в день, в квартире аккуратна.',
      'Пока ищем постоянный дом — очень нужна передержка: в шумном приюте Тоффи тоскует.',
    ] },
  { photo: 'oblako', name: 'Облако', species: 'dog', sex: 'male', ageYears: 7, size: 'small', cityName: 'Минск', org: 'ruki',
    isSterilized: true, isVaccinated: true, healthStatus: 'chronic_condition', publishedDaysAgo: 12, about: [
      'Маленький белый кудрявый пёс. Остался один после смерти пожилого хозяина.',
      'Спокойный компаньон: любит кресло, неспешные прогулки и когда с ним разговаривают. Идеален для пожилого человека.',
      'Есть хронический отит — нужно раз в неделю чистить уши, это занимает пять минут. Покажем, как это делать.',
    ] },
  { photo: 'ugolek', name: 'Уголёк', species: 'cat', sex: 'male', ageMonths: 5, size: 'small', cityName: 'Минск', org: 'ruki',
    isVaccinated: true, publishedDaysAgo: 3, about: [
      'Чёрный котёнок-подросток. Забирается во все ящики и коробки — на фото его любимое место.',
      'Игривый, но не царапается; к лотку и когтеточке приучен. Отдаём с договором о кастрации по возрасту.',
    ] },
  { photo: 'persik', name: 'Персик', species: 'cat', sex: 'male', ageYears: 6, size: 'medium', cityName: 'Минск', org: 'ruki',
    isSterilized: true, isVaccinated: true, specialStatus: ['reserved'], publishedDaysAgo: 9, about: [
      'Рыжий пушистый кот с роскошным хвостом. Невозмутимый, любит лежать на подоконнике и наблюдать.',
      'Кастрирован, привит. Сейчас забронирован: будущие хозяева приедут знакомиться на выходных.',
    ] },
  { photo: 'dymok', name: 'Дымок', species: 'dog', sex: 'male', ageYears: 3, size: 'large', cityName: 'Гомель', org: 'lapa',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 4, about: [
      'Крупный серый пёс с голубыми глазами. Выглядит серьёзно, а по характеру — большой ребёнок.',
      'Обожает людей, ласкается, знает «сидеть» и «лежать». Силён на поводке, поэтому нужен хозяин с опытом и желанием заниматься.',
      'Живёт на передержке в частном доме, во дворе не убегает.',
    ] },
  { photo: 'barni', name: 'Барни', species: 'dog', sex: 'male', ageYears: 2, size: 'medium', cityName: 'Гомель', org: 'lapa',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 6, about: [
      'Бигль. Весёлый, шумный и вечно голодный — как и положено породе.',
      'Отлично ладит с детьми и другими собаками. На прогулке идёт по следу, поэтому отпускать можно только на огороженной площадке.',
    ] },
  { photo: 'kashtan', name: 'Каштан', species: 'dog', sex: 'male', ageMonths: 3, size: 'medium', cityName: 'Гомель', org: 'lapa',
    isVaccinated: true, publishedDaysAgo: 1, about: [
      'Щенок, три месяца. Нашли в коробке у магазина вместе с двумя сёстрами — сестёр уже забрали.',
      'Вырастет средним, около 20 кг. Первая прививка сделана, вторую сделаем за счёт фонда.',
    ] },
  { photo: 'silver', name: 'Сильвер', species: 'cat', sex: 'male', ageYears: 2, size: 'medium', cityName: 'Брест', org: 'okno',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 3, about: [
      'Серебристый полосатый кот с янтарными глазами. Важный и аккуратный, на руках сидит недолго, зато всегда рядом.',
      'Кастрирован, привит, приучен к лотку и когтеточке. Подойдёт в квартиру без других котов — любит быть единственным.',
    ] },
  { photo: 'snezhka', name: 'Снежка', species: 'cat', sex: 'female', ageYears: 1, size: 'small', cityName: 'Брест', org: 'okno',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 0, about: [
      'Голубоглазая кошка с белыми «носочками». Нашли зимой в подъезде, отогрели и вылечили.',
      'Очень ласковая и разговорчивая: встречает у двери и рассказывает, как прошёл день.',
    ] },
  { photo: 'leo', name: 'Лео', species: 'cat', sex: 'male', ageYears: 4, size: 'medium', cityName: 'Брест', org: 'okno',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 10, about: [
      'Рыжий длинношёрстный кот. Любопытный, проверяет каждую сумку и каждого гостя.',
      'Ладит с другими кошками и спокойными собаками. Шерсть нужно вычёсывать раз в неделю — он это любит.',
    ] },
  { photo: 'chip', name: 'Чип', species: 'dog', sex: 'male', ageYears: 1, size: 'small', cityName: 'Гродно', org: 'hvost',
    isVaccinated: true, publishedDaysAgo: 2, about: [
      'Метис джек-рассела с большими ушами. Забрали из службы отлова в последний день срока.',
      'Подвижный, сообразительный, обожает игрушки-пищалки. Весит 7 кг — помещается на коленях и в переноске.',
    ] },
  { photo: 'sanni', name: 'Санни', species: 'dog', sex: 'female', ageYears: 3, size: 'large', cityName: 'Гродно', org: 'hvost',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 8, about: [
      'Золотистый ретривер. Улыбается почти всегда — фото не постановочное.',
      'Мягкая, послушная, идеально ведёт себя с детьми. От прежних хозяев отказ из-за переезда, документы есть.',
    ] },
  { photo: 'markiza', name: 'Маркиза', species: 'cat', sex: 'female', ageYears: 5, size: 'medium', cityName: 'Гродно', org: 'hvost',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 14, about: [
      'Плотная голубоглазая кошка с тёмной «маской». Спокойная, с чувством собственного достоинства.',
      'Не любит суету и маленьких детей, зато с одним-двумя взрослыми будет счастлива.',
    ] },
  { photo: 'lisa', name: 'Лиса', species: 'dog', sex: 'female', ageYears: 6, size: 'medium', cityName: 'Витебск', org: 'vernost',
    isSterilized: true, isVaccinated: true, publishedDaysAgo: 11, about: [
      'Рыже-белая собака с грустными глазами. Шесть лет прожила на цепи, в приюте впервые узнала, что такое диван.',
      'Тихая, деликатная, не лает без повода. Ей нужен спокойный дом и человек, который никуда не торопится.',
    ] },
  { photo: 'shtorm', name: 'Шторм', species: 'dog', sex: 'male', ageYears: 1, ageMonths: 6, size: 'medium', cityName: 'Витебск', org: 'vernost',
    isVaccinated: true, healthStatus: 'recovering', publishedDaysAgo: 4, about: [
      'Молодой рыжий пёс. Попал в клинику после ДТП с переломом лапы — операция прошла успешно, уже бегает.',
      'Через месяц снимем пластину, после этого ограничений не будет. Дружелюбный, любит воду и долгие прогулки.',
    ] },
  { photo: 'pyatnyshko', name: 'Пятнышко', species: 'cat', sex: 'female', ageYears: 2, size: 'small', cityName: 'Витебск', org: 'vernost',
    specialStatus: ['quarantine'], healthStatus: 'needs_treatment', publishedDaysAgo: 1, about: [
      'Бело-серая кошка, недавно с улицы. Проходит двухнедельный карантин и лечение от ушного клеща.',
      'Уже даётся в руки и мурчит. Забрать можно будет после карантина — познакомиться и забронировать можно сейчас.',
    ] },

  // --- найден ---
  { photo: 'nahodka', species: 'cat', sex: 'unknown', ageYears: 2, size: 'medium', cityName: 'Минск', org: 'ruki',
    lostOrFound: 'found', publishedDaysAgo: 0, about: [
      'Найден серо-белый кот во дворе на улице Садовой. Ухоженный, упитанный, людей не боится — явно домашний.',
      'Ошейника и чипа нет. Если узнали своего кота — позвоните в приют и опишите особые приметы.',
    ] },
];
