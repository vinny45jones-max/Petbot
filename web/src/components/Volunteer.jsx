import { useState } from 'react';
import { icons } from '../icons';

const types = [
  { id: 'foster',    label: 'Передержка', icon: 'heart',        hint: 'Временный дом на&nbsp;1–3 месяца. Корм и&nbsp;ветпомощь за&nbsp;наш счёт.' },
  { id: 'transport', label: 'Транспорт',  icon: 'send',         hint: 'Разовые поездки между городами или внутри одного.' },
  { id: 'vet',       label: 'Ветпомощь',  icon: 'messageHeart', hint: 'Для&nbsp;ветеринаров и&nbsp;студентов&nbsp;— осмотры и&nbsp;первичная помощь.' },
  { id: 'walk',      label: 'Выгул',      icon: 'paw',          hint: 'Выгул собак на&nbsp;передержке, 2–3&nbsp;раза в&nbsp;неделю.' },
];

export default function Volunteer({ onToast }) {
  const [active, setActive] = useState('foster');
  const cur = types.find((t) => t.id === active);
  const submit = (e) => {
    e.preventDefault();
    onToast && onToast('Заявка отправлена координатору. Свяжемся в течение часа.');
    e.target.reset();
  };
  return (
    <section className="section" id="volunteer">
      <div className="container">
        <div className="section-head">
          <span className="chip">Стать помощником</span>
          <h2>Помогать можно не&nbsp;только деньгами</h2>
          <p className="lead muted">Выберите, чем удобно&nbsp;— заявка придёт координатору в&nbsp;Telegram в&nbsp;течение часа.</p>
        </div>
        <div className="volunteer-card card">
          <div className="tabs">
            {types.map((t) => (
              <button
                key={t.id}
                className={'tab' + (active === t.id ? ' active' : '')}
                onClick={() => setActive(t.id)}
              >
                <span className="tab-icon" dangerouslySetInnerHTML={{ __html: icons[t.icon] }} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <p className="muted tab-hint" dangerouslySetInnerHTML={{ __html: cur.hint }} />
          <form className="form-grid" onSubmit={submit}>
            <label className="field">
              <span className="field-label">Имя</span>
              <input type="text" placeholder="Как к вам обращаться" />
            </label>
            <label className="field">
              <span className="field-label">Контакт</span>
              <input type="text" placeholder="@telegram или телефон" />
            </label>
            <label className="field">
              <span className="field-label">Город</span>
              <input type="text" placeholder="Минск, Москва, другое" />
            </label>
            <label className="field field-wide">
              <span className="field-label">Что вы можете</span>
              <textarea rows="3" placeholder="Например: могу взять кота на передержку на март и апрель, дома живёт собака и подросток." />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-lg">
                <span>Отправить заявку</span>
                <span dangerouslySetInnerHTML={{ __html: icons.arrowRight }} />
              </button>
              <span className="caption muted">Отправляя форму, вы&nbsp;соглашаетесь с&nbsp;<a href="#">политикой конфиденциальности</a>.</span>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
