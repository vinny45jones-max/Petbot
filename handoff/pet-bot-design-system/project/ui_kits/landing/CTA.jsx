// Final CTA — big warm slab with the Telegram button.
function CTA() {
  return (
    <section className="cta-slab" id="cta">
      <div className="container cta-inner">
        <div>
          <h2 className="cta-title">Помогите ещё одному питомцу<br/>найти дом.</h2>
          <p className="lead cta-lead">Откройте бота в&nbsp;Telegram, пришлите фото — и&nbsp;через минуту у&nbsp;вас будет готовое объявление.</p>
        </div>
        <div className="cta-actions">
          <a href="https://t.me/" target="_blank" rel="noopener" className="btn btn-primary btn-lg" dangerouslySetInnerHTML={{__html: window.PetIcons.telegram + '<span>Открыть в Telegram</span>'}} />
          <a href="#" className="btn btn-ghost btn-lg light">
            <span dangerouslySetInnerHTML={{__html: window.PetIcons.paw}} />
            <span>Посмотреть канал</span>
          </a>
        </div>
      </div>
    </section>
  );
}
window.CTA = CTA;
