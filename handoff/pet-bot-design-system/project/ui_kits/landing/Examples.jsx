// Examples — three sample text variants the bot generates.
function Examples() {
  const posts = [
    {
      tone: 'Трогательный',
      name: 'Муся №58',
      body: 'Муся провела два месяца во&nbsp;дворе и&nbsp;всё равно выбегает навстречу каждому человеку. Ей&nbsp;два года, она ласковая, невесомая и&nbsp;совершенно домашняя. Ищем руки, в&nbsp;которых ей&nbsp;будет спокойно.'
    },
    {
      tone: 'Информативный',
      name: 'Бари №59',
      body: 'Кобель, 4&nbsp;года, средний размер. Привит, кастрирован, обработан от&nbsp;паразитов. Спокойный, ходит на&nbsp;поводке, не&nbsp;тянет. Подойдёт в&nbsp;квартиру или во&nbsp;двор частного дома.'
    },
    {
      tone: 'С юмором',
      name: 'Тимофей №60',
      body: 'Тимофей уверен, что главный в&nbsp;квартире — он. Настроен серьёзно: спит на&nbsp;хозяйской подушке, лично проверяет пакеты из&nbsp;магазина. Ищет штат из&nbsp;1–2 человек для круглосуточной службы подносчиком лакомств.'
    },
  ];
  return (
    <section className="section" id="examples">
      <div className="container">
        <div className="section-head">
          <span className="chip">Пять текстов на&nbsp;выбор</span>
          <h2>Объявления в&nbsp;разном тоне</h2>
          <p className="lead muted">Бот пишет пять вариантов&nbsp;— трогательный, позитивный, информативный, душевный и&nbsp;с&nbsp;юмором. Выбираете любой, при желании правите в&nbsp;чате.</p>
        </div>
        <div className="posts">
          {posts.map((p, i) => (
            <article key={i} className="card post-card">
              <span className="chip post-tone">{p.tone}</span>
              <h4 className="post-title">{p.name}</h4>
              <p className="muted" dangerouslySetInnerHTML={{__html: p.body}} />
              <div className="post-foot">
                <button className="btn btn-ghost btn-sm">
                  <span dangerouslySetInnerHTML={{__html: window.PetIcons.heart}} style={{color:'#E2734A'}} />
                  <span>помочь</span>
                </button>
                <span className="caption">опубликовано в&nbsp;канале</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
window.Examples = Examples;
