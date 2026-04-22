// Help — card number on the left with a copy button, current needs on the right.
function Help() {
  const [copied, setCopied] = React.useState(false);
  const cardNumber = '2200 1234 5678 9012';
  const copy = () => {
    navigator.clipboard && navigator.clipboard.writeText(cardNumber.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const needs = [
    { p:'высокий',  title:'Операция Найде',           sum:'18 400 ₽',  body:'Овариогистерэктомия после осложнений. Срок — до&nbsp;29&nbsp;апреля.' },
    { p:'высокий',  title:'Передержка для Фреда',     sum:'6 000 ₽/мес', body:'Нужна семья на&nbsp;2–3&nbsp;месяца, пока ищем постоянный дом.' },
    { p:'средний',  title:'Корм для&nbsp;кошек',       sum:'4 500 ₽',   body:'Сухой и&nbsp;влажный корм для&nbsp;12&nbsp;животных у&nbsp;кураторов в&nbsp;Минске.' },
    { p:'средний',  title:'Транспорт Москва→Гомель',  sum:'3 200 ₽',   body:'Поезд и&nbsp;зооперевозчик для&nbsp;Пушка. Выезд 2&nbsp;мая.' },
  ];
  const priorityStyle = (p) => p === 'высокий'
    ? { background:'var(--brand-soft)', color:'var(--brand-hover)' }
    : { background:'var(--success-soft)', color:'#2C6D4F' };
  return (
    <section className="section bg-alt" id="help">
      <div className="container">
        <div className="section-head">
          <span className="chip">Помочь проекту</span>
          <h2>Перевод напрямую, без&nbsp;комиссий</h2>
          <p className="lead muted">Все сборы&nbsp;— прямые переводы на&nbsp;карту куратора. Мы&nbsp;не&nbsp;используем платёжные провайдеры. Отчёты публикуем в&nbsp;<a href="#">Telegram-канале</a>.</p>
        </div>
        <div className="help-grid">
          <div className="card help-card">
            <div className="help-card-label caption">Номер карты</div>
            <div className="help-card-num">{cardNumber}</div>
            <div className="help-card-meta">
              <span>МИР · Тинькофф</span>
              <span className="dot-sep">·</span>
              <span>Ирина К.</span>
            </div>
            <button className="btn btn-primary btn-lg help-copy" onClick={copy}>
              <span dangerouslySetInnerHTML={{__html: copied ? window.PetIcons.check : window.PetIcons.heart}}/>
              <span>{copied ? 'Скопировано' : 'Скопировать номер'}</span>
            </button>
            <p className="caption help-note">Указывайте комментарий «помощь&nbsp;— имя питомца», если хотите адресный сбор.</p>
          </div>
          <div className="needs">
            <div className="needs-head"><span>Актуальные нужды</span><span className="caption">на&nbsp;22&nbsp;апреля</span></div>
            {needs.map((n, i) => (
              <div key={i} className="need">
                <span className="need-chip" style={priorityStyle(n.p)}>{n.p}</span>
                <div className="need-body">
                  <div className="need-top">
                    <b>{n.title}</b>
                    <span className="need-sum">{n.sum}</span>
                  </div>
                  <p className="muted need-desc" dangerouslySetInnerHTML={{__html:n.body}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
window.Help = Help;
