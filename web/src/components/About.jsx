export default function About() {
  const stats = [
    { n: '284', label: 'питомца пристроено' },
    { n: '37',  label: 'активных волонтёров' },
    { n: '12',  label: 'городов РФ и РБ' },
  ];
  return (
    <section className="section" id="about">
      <div className="container about-grid">
        <div>
          <span className="chip">О проекте</span>
          <h2 className="about-h">Мы&nbsp;— волонтёры, которые соединяют людей и&nbsp;животных.</h2>
          <div className="about-text">
            <p>Pet Help — независимое сообщество кураторов, передержек и&nbsp;водителей в&nbsp;России и&nbsp;Беларуси. Мы&nbsp;находим кошек и&nbsp;собак на&nbsp;улице или забираем из&nbsp;переполненных приютов, лечим, социализируем и&nbsp;показываем вам.</p>
            <p>Каждого питомца ведёт конкретный человек&nbsp;— куратор. Он&nbsp;знает характер, привычки, медкарту, и&nbsp;честно расскажет вам всё до&nbsp;встречи. Без розовых очков и&nbsp;без давления.</p>
            <p>Мы&nbsp;не&nbsp;берём комиссии и&nbsp;не&nbsp;работаем с&nbsp;платёжными провайдерами. Все сборы&nbsp;— прямые переводы на&nbsp;карту куратора, с&nbsp;открытой отчётностью в&nbsp;Telegram-канале.</p>
            <p>Параллельно мы&nbsp;развиваем <b>Pet BOT</b>&nbsp;— бесплатный инструмент для волонтёров, который за&nbsp;минуту собирает готовое объявление из&nbsp;одного фото.</p>
          </div>
        </div>
        <div className="stats">
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-n">{s.n}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
