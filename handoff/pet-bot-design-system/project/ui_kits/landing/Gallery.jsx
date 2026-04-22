// Gallery — side-by-side "before / after" panels.
function Gallery() {
  return (
    <section className="section bg-alt" id="gallery">
      <div className="container">
        <div className="section-head">
          <span className="chip">Что получается</span>
          <h2>Ваше фото — в&nbsp;уютном кадре</h2>
          <p className="lead muted">Морда, окрас и&nbsp;выражение остаются теми&nbsp;же. Меняется только фон&nbsp;— на&nbsp;тёплый интерьер, в&nbsp;котором питомец выглядит как дома.</p>
        </div>
        <div className="gallery-grid">
          <figure className="before-after">
            <div className="frame small">
              <img src="../../assets/placeholders/pet-1.jpg" alt=""/>
              <span className="tag">До</span>
            </div>
            <div className="arrow" dangerouslySetInnerHTML={{__html: window.PetIcons.arrowRight}}/>
            <div className="frame big">
              <img src="../../assets/placeholders/pet-3.jpg" alt=""/>
              <span className="tag tag-brand">После</span>
              <div className="overlay">
                <b>Мурзик</b> · 2 года · средний · ласковый · привит
              </div>
            </div>
          </figure>
          <figure className="before-after">
            <div className="frame small">
              <img src="../../assets/placeholders/pet-2.jpg" alt=""/>
              <span className="tag">До</span>
            </div>
            <div className="arrow" dangerouslySetInnerHTML={{__html: window.PetIcons.arrowRight}}/>
            <div className="frame big">
              <img src="../../assets/placeholders/pet-4.jpg" alt=""/>
              <span className="tag tag-brand">После</span>
              <div className="overlay">
                <b>Рэкс</b> · 4 года · крупный · спокойный · здоров
              </div>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
window.Gallery = Gallery;
