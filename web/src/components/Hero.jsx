import { icons } from '../icons';

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="chip">Волонтёрский проект Ирины Комоловой</span>
          <h1 className="display">Каждой лапе&nbsp;— свой&nbsp;дом.</h1>
          <p className="lead">
            Мы помогаем кошкам и&nbsp;собакам из&nbsp;приютов и&nbsp;с&nbsp;улиц находить семью. Знакомьтесь с&nbsp;питомцами, забирайте домой или помогайте тем, кто ещё ищет.
          </p>
          <div className="hero-cta">
            <a href="#pets" className="btn btn-primary btn-lg">
              <span dangerouslySetInnerHTML={{ __html: icons.paw }} />
              <span>Посмотреть питомцев</span>
            </a>
            <a href="#help" className="btn btn-ghost btn-lg">
              <span dangerouslySetInnerHTML={{ __html: icons.heart }} style={{ color: '#E2734A' }} />
              <span>Помочь</span>
            </a>
          </div>
          <div className="hero-proof">
            <span className="check-row"><span dangerouslySetInnerHTML={{ __html: icons.check }} style={{ color: '#3F8F6A' }} />Проверенные кураторы</span>
            <span className="check-row"><span dangerouslySetInnerHTML={{ __html: icons.check }} style={{ color: '#3F8F6A' }} />Привиты и&nbsp;обработаны</span>
            <span className="check-row"><span dangerouslySetInnerHTML={{ __html: icons.check }} style={{ color: '#3F8F6A' }} />Помощь в&nbsp;переезде</span>
          </div>
        </div>
        <div className="hero-media">
          <div className="blob" />
          <div className="photo-stack">
            <img className="ph ph-1" src="/assets/placeholders/pet-3.jpg" alt="Котёнок ищет дом" />
            <img className="ph ph-2" src="/assets/placeholders/pet-4.jpg" alt="Собака ищет дом" />
            <img className="ph ph-3" src="/assets/placeholders/pet-5.jpg" alt="Щенок ищет дом" />
            <div className="float-badge">
              <span className="dot" /> <b>Барсик №47</b> · дома
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
