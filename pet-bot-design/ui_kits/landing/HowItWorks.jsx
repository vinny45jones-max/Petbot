// HowItWorks — three numbered steps with icon capsules.
function HowItWorks() {
  const steps = [
    { n: '01', icon: 'camera',       title: 'Пришлите фото', body: 'Любое чёткое фото кошки или собаки. Бот сохранит морду и окрас — изменит только фон и настроение.' },
    { n: '02', icon: 'messageHeart', title: 'Ответьте на вопросы', body: 'Семь коротких кнопок: тип, пол, возраст, размер, характер, здоровье, комментарий. На всё — полторы минуты.' },
    { n: '03', icon: 'sparkles',     title: 'Выберите и опубликуйте', body: 'Три варианта фото и пять текстов. Выберите, что нравится — бот опубликует в канал со сквозным номером питомца.' },
  ];
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <span className="chip">Как это работает</span>
          <h2>Три шага вместо часа работы</h2>
          <p className="lead muted">Раньше волонтёр тратил вечер на&nbsp;одно объявление. Теперь — одну минуту на&nbsp;анкету и&nbsp;полминуты на&nbsp;ожидание.</p>
        </div>
        <div className="steps">
          {steps.map((s) => (
            <div key={s.n} className="card step-card">
              <div className="step-top">
                <div className="icon-capsule brand" dangerouslySetInnerHTML={{__html: window.PetIcons[s.icon]}} />
                <span className="step-n">{s.n}</span>
              </div>
              <h3>{s.title}</h3>
              <p className="muted">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
window.HowItWorks = HowItWorks;
