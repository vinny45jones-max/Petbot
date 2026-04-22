const stories = [
  { name: 'Рыжик', photo: '/assets/placeholders/story-1.jpg',
    date: 'март 2026 · Минск',
    text: 'Рыжик два года жил во&nbsp;дворе и&nbsp;никого не&nbsp;подпускал. Ирина начала с&nbsp;того, что ставила миску с&nbsp;едой за&nbsp;углом. Через полгода он&nbsp;сам пришёл в&nbsp;её&nbsp;квартиру и&nbsp;лёг на&nbsp;батарею. Теперь он&nbsp;встречает Ирину с&nbsp;работы и&nbsp;спит на&nbsp;подушке.' },
  { name: 'Найда', photo: '/assets/placeholders/story-2.jpg',
    date: 'февраль 2026 · Москва',
    text: 'Щенка нашли в&nbsp;коробке у&nbsp;гаражей в&nbsp;мороз. Передержка, вакцинация, переезд на&nbsp;поезде&nbsp;— через три недели Найда уже осваивалась в&nbsp;квартире семьи Кузнецовых. Дети назвали её&nbsp;единогласно.' },
  { name: 'Мурка', photo: '/assets/placeholders/story-3.jpg',
    date: 'январь 2026 · Санкт-Петербург',
    text: 'Мурка попала к&nbsp;нам после того, как её&nbsp;прежние хозяева переехали и&nbsp;просто оставили во&nbsp;дворе. Две недели прожила у&nbsp;куратора, и&nbsp;её&nbsp;забрала одинокая бабушка. Они подходят друг другу идеально.' },
];

export default function Stories() {
  return (
    <section className="section" id="stories">
      <div className="container">
        <div className="section-head">
          <span className="chip">Истории успеха</span>
          <h2>Они нашли своих людей</h2>
          <p className="lead muted">Несколько историй о&nbsp;том, как заканчивается путь от&nbsp;улицы до&nbsp;дивана. Хотите стать следующей историей&nbsp;— смотрите <a href="#pets">питомцев</a>, которые всё ещё ищут.</p>
        </div>
        <div className="stories-grid">
          {stories.map((s, i) => (
            <article key={i} className="story card">
              <div className="story-photo"><img src={s.photo} alt={s.name} /></div>
              <div className="story-body">
                <h3 className="story-name">{s.name}</h3>
                <div className="caption story-date">{s.date}</div>
                <p className="muted" dangerouslySetInnerHTML={{ __html: s.text }} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
