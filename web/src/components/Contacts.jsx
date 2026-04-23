import { icons } from '../icons';
import { BOT_URL, BOT_USERNAME, TG_CHANNEL_URL, TG_CHANNEL_USERNAME } from '../config';

export default function Contacts({ onToast }) {
  const items = [
    { icon: 'messageHeart', label: 'Telegram-канал',                   value: TG_CHANNEL_USERNAME,        href: TG_CHANNEL_URL },
    { icon: 'paw',          label: 'Pet BOT — обработка фото животных', value: BOT_USERNAME,               href: BOT_URL },
    { icon: 'phone',        label: 'Телефон',                   value: '+375 29 668 64 82',        href: 'tel:+375296686482' },
    { icon: 'send',         label: 'Почта',                    value: 'iriska-sweety@yandex.ru',  href: 'mailto:iriska-sweety@yandex.ru' },
    { icon: 'clock',        label: 'Координаторы онлайн',      value: 'ежедневно, 10:00–22:00',   href: null },
  ];
  const submit = (e) => {
    e.preventDefault();
    onToast && onToast('Спасибо! Мы прочитаем и ответим лично.');
    e.target.reset();
  };
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
                <div className="icon-capsule moss" style={{ width: 48, height: 48 }} dangerouslySetInnerHTML={{ __html: icons[it.icon] }} />
                <div>
                  <div className="caption contact-label">{it.label}</div>
                  {it.href ? <a href={it.href} target="_blank" rel="noopener" className="contact-val">{it.value}</a> : <span className="contact-val">{it.value}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <form className="card feedback" onSubmit={submit}>
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
            <span dangerouslySetInnerHTML={{ __html: icons.arrowRight }} />
          </button>
        </form>
      </div>
    </section>
  );
}
