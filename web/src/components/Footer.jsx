import { BOT_URL, TG_CHANNEL_URL } from '../config';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <img src="/assets/logo-mark.svg" width="36" height="36" alt="" />
          <div className="brand-word" style={{ marginTop: 10, fontSize: 18 }}>Pet <b>Help</b></div>
          <p className="caption" style={{ marginTop: 12, maxWidth: 260 }}>Волонтёрское сообщество. РФ и&nbsp;РБ. Каждой лапе&nbsp;— свой&nbsp;дом.</p>
        </div>
        <div>
          <div className="foot-h">Проект</div>
          <a href="#pets">Питомцы</a>
          <a href="#stories">Истории</a>
          <a href="#help">Помочь</a>
          <a href="#volunteer">Стать помощником</a>
        </div>
        <div>
          <div className="foot-h">Связаться</div>
          <a href="mailto:hello@pethelp.ru">hello@pethelp.ru</a>
          <a href={TG_CHANNEL_URL} target="_blank" rel="noopener">Telegram-канал</a>
          <a href={BOT_URL} target="_blank" rel="noopener">Pet BOT для&nbsp;волонтёров</a>
        </div>
        <div>
          <div className="foot-h">Документы</div>
          <a href="#">Политика конфиденциальности</a>
          <a href="#">Отчёты о&nbsp;сборах</a>
        </div>
        <div className="foot-small">
          <span className="caption">© 2026 Pet Help. Сделано волонтёрами. Сайт не&nbsp;юрлицо&nbsp;— все сборы&nbsp;прямые переводы на&nbsp;карту куратора.</span>
        </div>
      </div>
    </footer>
  );
}
