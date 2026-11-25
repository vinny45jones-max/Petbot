// Реальные приюты и зоозащитные организации Беларуси (сбор из открытых источников, ноябрь 2026).
// Источники: azo.by (члены АЗО), dubasov.com/help-animals, 4lapki.by/shelters, сайты организаций,
// 2ГИС, Яндекс Карты, zerkalo.io, nashaniva.com. Контакты не подтверждены самими организациями:
// seed создаёт их неопубликованными и неверифицированными — публикует модератор после согласия организации.

export interface OrgSeed {
  name: string;
  cityName?: string;       // совпадает с Cities.nameRu; если города нет в справочнике — место пишется в address
  kind: string;            // тип организации, уходит в описание
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  vkUrl?: string;
  tgUrl?: string;
  viberUrl?: string;
  eripServiceCode?: string;
  unp?: string;
  note?: string;
  source: string;
}

export const organizationsBY: OrgSeed[] = [
  // Минск и Минская область
  {
    name: 'Суперкот', cityName: 'Минск', kind: 'Приют для кошек из отлова (МБООПЖ «Суперкот»)',
    address: 'ул. Гурского, 42 (по 2ГИС)', websiteUrl: 'https://superkot.by',
    instagramUrl: 'https://www.instagram.com/superkot_by', vkUrl: 'https://vk.com/happysuperkot',
    note: 'ЕРИП: Благотворительность → Общественные объединения → Защита животных → Суперкот. Facebook: facebook.com/superkotby',
    source: 'superkot.by, 2ГИС, dubasov.com',
  },
  {
    name: 'ЗООшанс', cityName: 'Минск', kind: 'Волонтёрское объединение, животные на передержках (МБООПЖ «ЗООшанс»)',
    address: 'ул. Будславская, 21А, пом. 32К (юр. адрес); почта: 220113, а/я 408',
    phone: '+375 29 191-10-92, +375 29 191-10-93, +375 29 191-10-94, +375 29 191-10-95',
    email: 'cat@zooshans.by', websiteUrl: 'https://zooshans.by', instagramUrl: 'https://www.instagram.com/zooshans_by',
    unp: '194901515',
    note: 'Пункта приёма животных нет. ЕРИП: Защита животных → Зоошанс',
    source: 'zooshans.by/contacts, minsk-city.by, apet.by',
  },
  {
    name: 'Эгида', cityName: 'Минск', kind: 'Общественное объединение защиты животных (ООЗЖ «Эгида»)',
    address: 'ул. Карла Маркса, 27', websiteUrl: 'https://egida.by', eripServiceCode: '4345041', unp: '101860476',
    note: 'Стерилизация, пристройство, акции раздачи. Телефон в справочниках обрезан (+375 29 630-79-…)',
    source: 'spravka.by, nashaniva.com, kp.ru, dubasov.com',
  },
  {
    name: 'Старый кот', cityName: 'Минск', kind: 'Центр помощи бездомным кошкам: травмы, инвалиды, пожилые (не приют)',
    address: 'пр-т Дзержинского, 131, оф. 622 (юр. адрес)', phone: '+375 33 385-38-23 (голодный номер)',
    email: 'info@oldcat.by', websiteUrl: 'https://oldcat.by', instagramUrl: 'https://www.instagram.com/old_cat_belarus',
    tgUrl: 'https://t.me/Old_Cat_Belarus', eripServiceCode: '5337571',
    note: 'Основной канал связи: директ Instagram. Член АЗО',
    source: 'oldcat.by, azo.by, dubasov.com',
  },
  {
    name: 'Фонд «Живи»', cityName: 'Минск', kind: 'Благотворительный фонд помощи животным-инвалидам и их волонтёрам',
    websiteUrl: 'https://fond-zhivi.by', instagramUrl: 'https://www.instagram.com/fond_zhivi_',
    note: 'ЕРИП: Защита животных → Живи', source: 'dubasov.com',
  },
  {
    name: 'Мурзики (Минск)', cityName: 'Минск', kind: 'Волонтёрская инициатива (не приют)',
    instagramUrl: 'https://www.instagram.com/murziki.by', vkUrl: 'https://vk.com/murzikiby',
    note: 'Реквизиты в Instagram', source: 'dubasov.com',
  },
  {
    name: 'Далай Лапа', cityName: 'Марьина Горка', kind: 'Приют для собак (учреждение «Центр помощи бездомным животным «Долина трёх китов»)',
    address: 'Марьина Горка, 30–35 км от Минска', phone: '+375 29 396-84-51 (Ольга)',
    viberUrl: 'viber://chat?number=%2B375293968451', websiteUrl: 'https://www.dalailapa.by',
    instagramUrl: 'https://www.instagram.com/dalailapa.by', tgUrl: 'https://t.me/dalailapa_walk',
    note: 'Около 50 собак, часть на передержках. Можно приезжать на прогулки. Второй Instagram: priut.v.mgorke',
    source: 'dalailapa.by, 4lapki.by, dubasov.com',
  },
  {
    name: 'Кот в окошке', cityName: 'Минск', kind: 'Приют для кошек (ООЗЖ «Кот в окошке»)',
    address: 'ул. Скрипникова, 16, комн. 5Б (юр. адрес)', websiteUrl: 'https://kotvokoshke.relax.by', unp: '194903666',
    source: 'relax.by',
  },
  {
    name: 'Мур-Маяк', cityName: 'Минск', kind: 'Зоозащитное учреждение «Центр помощи бездомным животным Мур-Маяк» (кошки)',
    address: 'ул. Маяковского (номер дома не указан)', note: 'Работает с 2024 года', source: '4lapki.by',
  },
  {
    name: 'Вторая жизнь', cityName: 'Минск', kind: 'Волонтёрская команда (собаки)',
    phone: '+375 44 762-30-04', instagramUrl: 'https://www.instagram.com/Anutik_yunik',
    note: 'Около 40 собак, забирают с Гурского и из гомельского пункта отлова', source: '4lapki.by',
  },
  { name: 'Дом собачьей надежды', cityName: 'Минск', kind: 'Волонтёрский приют', note: 'Контакты в карточке 2ГИС', source: '2ГИС' },
  {
    name: 'Кот и собака', cityName: 'Минск', kind: 'Приют для животных (ООЗЖ «КиС»)',
    address: 'ул. Мележа, 5, корп. 1, оф. 408 (почтовый адрес)', email: 'info@kotisobaka.by',
    websiteUrl: 'https://kotisobaka.by',
    note: 'Email только для юридической переписки. Около 36 животных в каталоге TailHarbor',
    source: 'kotisobaka.by, tailharbor.eu, 2ГИС',
  },
  {
    name: 'Барбос', cityName: 'Минск', kind: 'Общество защиты животных «Барбос», пристройство',
    websiteUrl: 'https://barbos.by', instagramUrl: 'https://www.instagram.com/barbos_belarus',
    note: 'Facebook: facebook.com/Barbos.Belarus. Около 76 животных в каталоге TailHarbor', source: 'barbos.by, tailharbor.eu',
  },
  {
    name: 'HelpSafe', cityName: 'Минск', kind: 'Волонтёрский портал и координация по всей РБ (не приют)',
    websiteUrl: 'https://helpsafe.by', instagramUrl: 'https://www.instagram.com/helpsafe.by', tgUrl: 'https://telegram.me/helpsafeby',
    note: 'Facebook: facebook.com/groups/helpsafe.by; YouTube: @helpsafe', source: 'zooplaneta.by, tailharbor.eu',
  },
  {
    name: 'Котята даром (Kotby)', cityName: 'Минск', kind: 'Доска объявлений «в дар» (не приют)',
    address: 'ул. Чечота, 25, оф. 55', websiteUrl: 'https://kotby.by',
    note: 'Около 1260 объявлений в каталоге TailHarbor', source: 'spravka.by, tailharbor.eu',
  },
  { name: 'tuzikdogs', cityName: 'Минск', kind: 'Волонтёры', instagramUrl: 'https://www.instagram.com/tuzikdogs', source: 'instagram.com' },
  {
    name: 'Помощь бездомным животным МИНСК (ОК)', cityName: 'Минск', kind: 'Волонтёрская группа в соцсети',
    note: 'ok.ru/group57780067237925', source: 'ok.ru',
  },
  {
    name: 'Помощь животным Солигорска', cityName: 'Солигорск', kind: 'Волонтёрское сообщество',
    note: 'Более 5000 участников; группа ОК: ok.ru/group53314449637568; также помогают в Слуцке',
    source: 'stc-tv.by, shahter.by, slutsk-gorod.by, ok.ru',
  },
  { name: 'Борисов: помощь бездомным животным (ОК)', cityName: 'Борисов', kind: 'Волонтёрская группа в соцсети', note: 'ok.ru/group/51751833436397', source: 'ok.ru' },
  { name: 'Pesokot.by', cityName: 'Минск', kind: 'Приют для животных', websiteUrl: 'https://pesokot.by', note: 'Контакты в карточке 2ГИС', source: '2ГИС' },
  { name: 'Домик спасённых душ', kind: 'Приют для животных', address: 'Гатово, Минский район', note: 'Контакты в карточке 2ГИС', source: '2ГИС' },
  {
    name: 'Спаси хвостатых. Колодищи', kind: 'Волонтёрская команда', address: 'Колодищи, Минский район',
    instagramUrl: 'https://www.instagram.com/kolodischi_sos', tgUrl: 'https://t.me/kolodischisos',
    note: 'Threads: @kolodischi_sos', source: '4lapki.by',
  },
  { name: 'ФортунаДогс', kind: 'Приют для собак', address: 'Минская область', note: 'Нуждается в корме', source: '4lapki.by' },
  {
    name: 'cats_and_dogs.sos', cityName: 'Несвиж', kind: 'Волонтёр-одиночка',
    phone: '+375 29 296-08-28', instagramUrl: 'https://www.instagram.com/cats_and_dogs.sos', source: '4lapki.by',
  },
  {
    name: 'help_animals_volozin', kind: 'Волонтёрская команда', address: 'Воложин',
    instagramUrl: 'https://www.instagram.com/help_animals_volozin', source: '4lapki.by',
  },
  {
    name: 'Шанс на жизнь', cityName: 'Молодечно', kind: 'Общественное объединение защиты животных (ООЗЖ «Шанс на жизнь»)',
    instagramUrl: 'https://www.instagram.com/oozzh_shans_na_zhizn', vkUrl: 'https://vk.com/oozzh_shans_na_zhizn',
    eripServiceCode: '4765411', note: 'Стерилизация, лечение, пристройство. Член АЗО', source: 'azo.by, dubasov.com',
  },
  {
    name: 'Сирин', cityName: 'Минск', kind: 'Центр помощи птицам и животным «Пустельга»: дикие птицы и звери',
    websiteUrl: 'https://sirin.by', instagramUrl: 'https://www.instagram.com/sirin_zoo', eripServiceCode: '4481871',
    note: 'Член АЗО', source: 'azo.by, dubasov.com',
  },
  { name: 'Городские голуби', cityName: 'Минск', kind: 'Учреждение по защите птиц', note: 'Член АЗО', source: 'azo.by' },

  // Брестская область
  { name: 'Доброта', cityName: 'Брест', kind: 'Приют для животных', address: 'ул. Писателя Смирнова, 161Ж', note: 'Контакты в карточке Яндекс Карт', source: 'Яндекс Карты' },
  {
    name: 'Анималхелп', cityName: 'Брест', kind: 'Зоозащитное учреждение «Анималхелп»',
    instagramUrl: 'https://www.instagram.com/animalhelpby', vkUrl: 'https://vk.com/animalhelpby',
    note: 'Ветпомощь, пристройство. Реквизиты в Instagram. Член АЗО', source: 'azo.by, dubasov.com',
  },
  {
    name: 'Преданность другу', cityName: 'Пинск', kind: 'Учреждение по защите животных «ПРЕДАННОСТЬ ДРУГУ»',
    websiteUrl: 'https://predanostdrugu.com', vkUrl: 'https://vk.com/predanostdrugu.pinsk', eripServiceCode: '1731592',
    note: 'Лечение, стерилизация, пристройство. Член АЗО', source: 'azo.by, dubasov.com',
  },
  {
    name: 'Мурзики (Барановичи)', cityName: 'Барановичи', kind: 'Учреждение по защите животных «Мурзики»',
    vkUrl: 'https://vk.com/murziki2020', note: 'Член АЗО. Возможно, связаны с «Мурзиками» в Минске', source: 'azo.by',
  },

  {
    name: 'SOS – помощь бездомным животным г. Кобрина', cityName: 'Кобрин', kind: 'Волонтёры, частный мини-приют / передержка',
    phone: '+375 33 307-52-77 (Людмила), +375 29 734-68-15 (Екатерина)', websiteUrl: 'https://sos-kobrin.by',
    note: 'Работает с 2015 года. Группа ОК: ok.ru/sospomo', source: 'sos-kobrin.by, ok.ru',
  },
  { name: 'Четвероногий дружок для вашей семьи', cityName: 'Кобрин', kind: 'Группа добровольных волонтёров', note: 'Контакты не найдены', source: 'greenbelarus.info' },
  { name: 'Помощь бездомным животным, Лунинец', cityName: 'Лунинец', kind: 'Волонтёры', note: 'Группа ВКонтакте с таким названием, публикуют финотчёты', source: 'domwody.by' },
  {
    name: 'Волонтёры ивацевичского приюта', cityName: 'Ивацевичи', kind: 'Волонтёры местного временного питомника',
    phone: '+375 33 323-44-40 (Ольга), +375 29 525-44-15 (Светлана)',
    note: 'Viber-чат «Мой новый лучший друг». Телефоны из публикации 2019 года, нужна проверка', source: '1reg.pro',
  },
  { name: 'Помощь бездомным животным Столина', cityName: 'Столин', kind: 'Инициативная группа волонтёров', note: 'Ухаживают за собаками в ПВС ЖКХ', source: '1reg.pro' },

  // Гродненская область
  {
    name: 'Zoo-Help (Лида)', cityName: 'Лида', kind: 'Волонтёрское движение, передержки',
    phone: '+375 33 360-13-15 (Марина), +375 29 598-04-59 (Татьяна), +375 29 589-98-62',
    instagramUrl: 'https://www.instagram.com/Zoo_Lida',
    note: 'Работает с 2015 года. Группа ОК: ok.ru/nazapravke, группа ВКонтакте «Zoo-help»', source: 'ok.ru, pvlida.by, lidanews.by',
  },
  {
    name: 'Преданное сердце', cityName: 'Гродно', kind: 'Приют собак и кошек (ГООЗЖ «Преданное сердце»)',
    address: 'мкр. Лапенки (точный адрес не указан)', websiteUrl: 'https://predannoeserdce.by',
    instagramUrl: 'https://www.instagram.com/predannoe', vkUrl: 'https://vk.com/predannoeserdce', eripServiceCode: '241285',
    note: 'Около 67 животных в каталоге TailHarbor. TikTok: @predannoe_serdce.grodno. Член АЗО',
    source: 'predannoeserdce.by, zerkalo.io, tailharbor.eu, azo.by',
  },
  {
    name: 'Спаси жизнь', cityName: 'Гродно', kind: 'Благотворительное общественное объединение защиты животных «Спаси жизнь»',
    websiteUrl: 'https://save-life.netlify.app', instagramUrl: 'https://www.instagram.com/animalsgrodno',
    vkUrl: 'https://vk.com/animalsgrodno', eripServiceCode: '246785',
    note: 'Помогает животным из гродненского пункта отлова. Член АЗО', source: 'azo.by, dubasov.com',
  },
  {
    name: 'След жизни', cityName: 'Гродно', kind: 'Общественное объединение защиты животных (ГООЗЖ «След жизни»)',
    websiteUrl: 'https://sledzhizni.by', vkUrl: 'https://vk.com/sledzhizni', eripServiceCode: '232525',
    note: 'Лечение, питание, поиск домов. Член АЗО', source: 'azo.by, dubasov.com',
  },
  {
    name: 'ВолкоВита', cityName: 'Волковыск', kind: 'Общественное объединение защиты животных «ВолкоВита»',
    instagramUrl: 'https://www.instagram.com/volkovita_sos', vkUrl: 'https://vk.com/volkovita',
    note: 'ЕРИП: Защита животных → ВолкоВита. Член АЗО', source: 'azo.by, dubasov.com',
  },

  // Гомельская область
  {
    name: 'Уголок надежды', cityName: 'Гомель', kind: 'Волонтёры (собаки)',
    phone: '+375 29 731-54-83 (голодный номер)', instagramUrl: 'https://www.instagram.com/ugolok_nadezdy_gomel',
    note: '105+ собак под опекой', source: 'instagram.com',
  },
  {
    name: 'Лапки', cityName: 'Гомель', kind: 'Общественное объединение защиты животных (ГОООЗЖ «Лапки»)',
    instagramUrl: 'https://www.instagram.com/lapki_gomel', eripServiceCode: '1534484', source: 'instagram.com',
  },
  {
    name: 'Кошкин дом «Чистое сердце»', cityName: 'Гомель', kind: 'Волонтёрское объединение (кошки)',
    phone: '+375 33 329-87-49 (голодный номер)', instagramUrl: 'https://www.instagram.com/pure_heart_cat_house',
    source: 'dubasov.com',
  },
  { name: 'Котомания', cityName: 'Гомель', kind: 'Волонтёр-одиночка (кошки)', note: 'Не приют', source: '4lapki.by' },
  {
    name: 'Верные друзья', cityName: 'Мозырь', kind: 'Приют для бездомных животных (ООЗЖ «Верные друзья»)',
    instagramUrl: 'https://www.instagram.com/vernye.druzya.mozyr', vkUrl: 'https://vk.com/vernye.druzya.mozyr',
    note: 'ЕРИП: Защита животных → Верные друзья. Член АЗО', source: 'azo.by, dubasov.com',
  },
  {
    name: 'Дом с хвостом', cityName: 'Речица', kind: 'Частное социально-благотворительное учреждение «Дом с хвостом»',
    instagramUrl: 'https://www.instagram.com/dom_shvostom_rechitsa', vkUrl: 'https://vk.com/dom_shvostom_rechitsa',
    eripServiceCode: '1535594', note: 'Временное жильё, лечение, пристройство. Член АЗО', source: 'azo.by, dubasov.com',
  },

  {
    name: 'Лучик надежды (Жлобин)', cityName: 'Жлобин', kind: 'Волонтёрская группа',
    note: 'ok.ru/group/52347152498846; также «Помощь бездомным животным г. Жлобина»: ok.ru/group/53122326724732', source: 'ok.ru',
  },
  {
    name: 'Помощь бездомным животным г. Светлогорска', cityName: 'Светлогорск', kind: 'Волонтёрская группа',
    phone: '+375 44 700-78-60 (Лена)', vkUrl: 'https://vk.com/public212439475', source: 'svetlik.net, vk.com',
  },
  {
    name: 'Помощь животным | Рогачёв, Светлогорск, Жлобин', cityName: 'Рогачёв', kind: 'Волонтёрская команда',
    vkUrl: 'https://vk.com/rogachevhelp', note: 'За год пристроили более 70 кошек', source: 'slova.by, vk.com',
  },
  { name: 'Подари им шанс', cityName: 'Гомель', kind: 'Волонтёрское движение (не приют)', note: 'ok.ru/gruppavolo', source: 'ok.ru' },
  {
    name: 'Волонтёры гомельского отлова', cityName: 'Гомель', kind: 'Волонтёры, ищут дома собакам из отлова',
    phone: '+375 29 654-08-79 (Ксения)', note: 'ok.ru/group/70000025133155. Доставка по Беларуси и в Россию', source: 'ok.ru',
  },

  // Могилёвская область
  {
    name: 'Варежка добра / кОтель', cityName: 'Могилёв', kind: 'Волонтёры (кошки)',
    phone: '+375 29 516-29-49 (Наталья)', note: 'ok.ru/group58016172343371', source: 'ok.ru',
  },
  {
    name: 'Доброе сердце (Могилёв)', cityName: 'Могилёв', kind: 'ОО «Могилёвское общество защиты животных» (не приют)',
    websiteUrl: 'http://dsmogilev.by', instagramUrl: 'https://www.instagram.com/dobroe_serdce_mogilev',
    note: 'Главное направление: стерилизация. ЕРИП: Благотворительность → Могилевское общество защиты животных ОО. Член АЗО',
    source: 'azo.by, dubasov.com',
  },
  { name: 'Остров добра', cityName: 'Могилёв', kind: 'Учреждение по защите животных «Остров добра»', vkUrl: 'https://vk.com/club209049492', note: 'Член АЗО', source: 'azo.by' },
  {
    name: 'Хатико (общество «Пять свобод»)', cityName: 'Бобруйск', kind: 'Приют для собак',
    note: 'Около 160 собак в вольерах, земля выкуплена обществом', source: 'zerkalo.io, nashaniva.com',
  },

  // Витебская область
  {
    name: 'Добрик', cityName: 'Витебск', kind: 'Приют для бездомных животных', websiteUrl: 'https://dobrik.by',
    note: 'Сюда привозят животных с отлова; возможно, это приют при ГП «Спецавтобаза г. Витебска» (не проверено)',
    source: 'zerkalo.io, tailharbor.eu',
  },
  {
    name: 'Друг (Новополоцк)', cityName: 'Новополоцк', kind: 'Благотворительное общественное объединение защиты животных «Друг», приют',
    phone: '+375 33 678-92-42, +375 29 712-57-00', note: 'Телефоны из публикации 2018 года, нужна проверка',
    source: 'novopolotsk.by, gorod214.by',
  },
  {
    name: 'Добрые руки (Новополоцк)', cityName: 'Новополоцк', kind: 'Общество защиты животных',
    note: 'Помогает ПВС Новополоцкой спецавтобазы. Контакты не найдены', source: 'novaya.by',
  },
  {
    name: 'ШАНС (Боровуха)', cityName: 'Новополоцк', kind: 'БООПЖ «ШАНС», приют для бездомных животных',
    address: 'Боровуха-1', phone: '+375 33 694-40-04',
    note: 'Телефон из поста о собаке приюта (#приют_шанс_Новополоцк), нужна проверка', source: 'psu.by, ok.ru',
  },
  { name: 'Право на жизнь', cityName: 'Полоцк', kind: 'Приют для животных', note: 'Полоцкий район. Контакты не найдены', source: 'pvestnik.by' },
  {
    name: 'Помощь животным в Полоцке и Новополоцке', cityName: 'Новополоцк', kind: 'Волонтёрское движение',
    websiteUrl: 'https://homeless-by.orgs.biz', note: 'В источнике номер с ошибкой (+7 (033) 695-00-12), вероятно +375 33 695-00-12',
    source: 'homeless-by.orgs.biz',
  },
];

// Контакты муниципальных служб отлова. Ключ — name из intakeFacilitiesBY.
// Скрипт seed-organizations заполняет только пустые поля и ничего не перезаписывает.
export const intakeFacilityContactsBY: Record<string, { address?: string; phone?: string; viberUrl?: string; contactTgUrl?: string; source: string }> = {
  'Городская служба отлова (Брест)': {
    address: 'Ковельская ул., 7/4 (участок по отлову и содержанию безнадзорных животных)',
    source: 'Яндекс Карты',
  },
  'Городская служба отлова (Витебск)': {
    address: 'Старобабиновичский тракт, 29 (приют ГП «Спецавтобаза г. Витебска»)',
    phone: '+375 29 590-00-22 (бригадир); +375 33 336-78-77 (начальник); +375 33 319-06-25 (ветврач)',
    source: 'ok.ru/vitebskpri (vk.com/priut_vitebsk)',
  },
  'Городская служба отлова (Гомель)': {
    address: 'ул. Федюнинского, 21 (участок содержания животных КУП «Спецкоммунтранс»)',
    phone: '+375 232 73-11-74',
    source: 'vseadresa.org, gomel.spravka.by',
  },
};
