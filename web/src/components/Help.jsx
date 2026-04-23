import { useState } from 'react';
import { icons } from '../icons';
import { TG_CHANNEL_URL } from '../config';

const cardNumber = '4641 3200 4006 1417';
const cardExpiry = '07/26';

const needs = [
  { p: 'высокий', title: 'Операция Найде',          raised: 8200, goal: 18400, body: 'Овариогистерэктомия после осложнений. Срок — до&nbsp;29&nbsp;апреля.' },
  { p: 'высокий', title: 'Передержка для Фреда',    raised: 1500, goal: 6000,  body: 'Семья на&nbsp;2–3&nbsp;месяца, пока ищем постоянный дом. Сборы — корм и&nbsp;наполнитель.' },
  { p: 'средний', title: 'Корм для&nbsp;кошек',      raised: 3100, goal: 4500,  body: 'Сухой и&nbsp;влажный корм для&nbsp;12&nbsp;животных у&nbsp;кураторов в&nbsp;Минске.' },
  { p: 'средний', title: 'Транспорт Москва→Гомель', raised: 3200, goal: 3200,  body: 'Поезд и&nbsp;зооперевозчик для&nbsp;Пушка. Выезд 2&nbsp;мая — собрано.' },
];

const fmt = (n) => n.toLocaleString('ru-RU') + ' ₽';

const priorityStyle = (p) => p === 'высокий'
  ? { background: 'var(--brand-soft)', color: 'var(--brand-hover)' }
  : { background: 'var(--success-soft)', color: '#2C6D4F' };

export default function Help({ onToast }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard && navigator.clipboard.writeText(cardNumber.replace(/\s/g, ''));
    setCopied(true);
    onToast && onToast('Номер карты скопирован — спасибо!');
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <section className="section bg-alt" id="help">
      <div className="container">
        <div className="section-head">
          <span className="chip">Помочь проекту</span>
          <h2>Перевод напрямую, без&nbsp;комиссий</h2>
          <p className="lead muted">Все сборы&nbsp;— прямые переводы на&nbsp;карту куратора. Мы&nbsp;не&nbsp;используем платёжные провайдеры. Отчёты публикуем в&nbsp;<a href={TG_CHANNEL_URL} target="_blank" rel="noopener">Telegram-канале</a>.</p>
        </div>
        <div className="help-grid">
          <div className="card help-card">
            <div className="help-card-label caption">Номер карты</div>
            <div className="help-card-num">{cardNumber}</div>
            <div className="help-card-meta">
              <span>Irina K.</span><span className="dot-sep">·</span><span>до {cardExpiry}</span>
            </div>
            <button className="btn btn-primary btn-lg help-copy" onClick={copy}>
              <span dangerouslySetInnerHTML={{ __html: copied ? icons.check : icons.heart }} />
              <span>{copied ? 'Скопировано' : 'Скопировать номер'}</span>
            </button>
            <p className="caption help-note">Указывайте комментарий «помощь&nbsp;— имя питомца», если хотите адресный сбор.</p>
          </div>
          <div className="needs">
            <div className="needs-head"><span>Актуальные нужды</span><span className="caption">на&nbsp;22&nbsp;апреля</span></div>
            {needs.map((n, i) => {
              const pct = Math.min(100, Math.round((n.raised / n.goal) * 100));
              const done = pct >= 100;
              return (
                <div key={i} className="need">
                  <div className="need-row">
                    <span className="need-chip" style={priorityStyle(n.p)}>{n.p}</span>
                    <b className="need-title">{n.title}</b>
                  </div>
                  <p className="muted need-desc" dangerouslySetInnerHTML={{ __html: n.body }} />
                  <div className="need-progress">
                    <div className="need-bar"><div className="need-fill" style={{ width: pct + '%', background: done ? 'var(--success)' : 'var(--brand)' }} /></div>
                    <div className="need-nums">
                      <span><b>{fmt(n.raised)}</b> <span className="muted">из {fmt(n.goal)}</span></span>
                      <span className="need-pct" style={{ color: done ? 'var(--success)' : 'var(--brand-hover)' }}>{done ? 'собрано' : pct + '%'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
