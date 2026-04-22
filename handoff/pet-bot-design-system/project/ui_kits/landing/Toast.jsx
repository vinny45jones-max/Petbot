// Toast — общий контейнер уведомлений.
function ToastHost({ toasts, onClose }) {
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-dot" dangerouslySetInnerHTML={{__html: window.PetIcons.check}}/>
          <span className="toast-text">{t.text}</span>
          <button className="toast-x" onClick={() => onClose(t.id)} aria-label="Закрыть">×</button>
        </div>
      ))}
    </div>
  );
}
window.ToastHost = ToastHost;

// Mobile sticky CTA-bar — показывается на скролле > 600 на узких экранах.
function MobileBar({ onAdopt }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={'mobile-bar' + (show ? ' show' : '')}>
      <a href="#pets" className="btn btn-ghost btn-sm">
        <span dangerouslySetInnerHTML={{__html: window.PetIcons.paw}}/>
        <span>Питомцы</span>
      </a>
      <a href="#help" className="btn btn-primary btn-sm">
        <span dangerouslySetInnerHTML={{__html: window.PetIcons.heart}}/>
        <span>Помочь</span>
      </a>
    </div>
  );
}
window.MobileBar = MobileBar;
