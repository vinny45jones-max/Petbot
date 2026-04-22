// Contacts + Footer combined: Telegram channel, Pet BOT, email, city, feedback form.
function Contacts() {
  const items = [
    { icon:'messageHeart', label:'Telegram-канал', value:'@pethelp_channel', href:'#' },
    { icon:'paw',          label:'Pet BOT — для волонтёров', value:'@petbot', href:'#' },
    { icon:'send',         label:'Почта',          value:'hello@pethelp.ru', href:'mailto:hello@pethelp.ru' },
    { icon:'clock',        label:'Координаторы онлайн', value:'ежедневно, 10:00–22:00', href:null },
  ];
  return (
    <section className="section bg-alt" id="contacts">
      <div className="container contacts-grid">
        <div>
          <span className="chip">Контакты</span>
          <h2 className="contacts-h">Напишите нам — ответим.</h2>
          <p className="lead muted">Вы можете спросить про&nbsp;конкретного питомца, предложить помощь или просто познакомиться. Мы&nbsp;не&nbsp;используем робо-ответы&nbsp;— отвечают люди.</p>
          <div className="contact-list">
            {items.map((it, i) => (
              <div key={i} className="contact-item">
                <div className="icon-capsule moss" style={{width:48, height:48}} dangerouslySetInnerHTML={{__html:window.PetIcons[it.icon]}}/>
                <div>
                  <div className="caption contact-label">{it.label}</div>
                  {it.href ? <a href={it.href} className="contact-val">{it.value}</a> : <span className="contact-val">{it.value}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <form className="card feedback" onSubmit={(e)=>e.preventDefault()}>
          <h3 className="feedback-h">Обратная связь</h3>
          <label className="field">
            <span className="field-label">Имя</span>
            <input type="text" placeholder="Ваше имя" />
          </label>
          <label className="field">
            <span className="field-label">Контакт</span>
            <input type="text" placeholder="@telegram или email" />
          </label>
          <label className="field">
            <span className="field-label">Сообщение</span>
            <textarea rows="4" placeholder="О чём хотите рассказать?" />
          </label>
          <button type="submit" className="btn btn-primary">
            <span>Отправить</span>
            <span dangerouslySetInnerHTML={{__html: window.PetIcons.arrowRight}}/>
          </button>
        </form>
      </div>
    </section>
  );
}
window.Contacts = Contacts;
