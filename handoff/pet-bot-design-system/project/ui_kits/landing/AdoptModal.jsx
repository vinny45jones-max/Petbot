// Adopt modal — opens when a Pet card's "Хочу забрать" is clicked.
function AdoptModal({ pet, onClose, onToast }) {
  React.useEffect(() => {
    if (!pet) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [pet, onClose]);
  if (!pet) return null;
  const submit = (e) => {
    e.preventDefault();
    onToast && onToast(`Заявка на ${pet.name} отправлена куратору. Ответим в течение дня.`);
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
        <div className="modal-head">
          <img src={pet.photo} alt={pet.name} className="modal-pet"/>
          <div>
            <div className="caption">Заявка на&nbsp;усыновление</div>
            <h3 className="modal-title">{pet.name}</h3>
            <div className="muted" style={{fontSize:15}}>{pet.species} · {pet.sex} · {pet.age}</div>
          </div>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <input type="hidden" name="pet_id" value={pet.id}/>
          <label className="field">
            <span className="field-label">Имя</span>
            <input type="text" placeholder="Как к вам обращаться"/>
          </label>
          <label className="field">
            <span className="field-label">Контакт</span>
            <input type="text" placeholder="@telegram или телефон"/>
          </label>
          <label className="field">
            <span className="field-label">Город</span>
            <input type="text" placeholder="Ваш город"/>
          </label>
          <label className="field field-wide">
            <span className="field-label">Сообщение куратору</span>
            <textarea rows="3" placeholder="Расскажите о&nbsp;себе: есть ли другие животные, дети, опыт содержания."/>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg">
              <span>Отправить заявку</span>
              <span dangerouslySetInnerHTML={{__html: window.PetIcons.arrowRight}}/>
            </button>
            <span className="caption muted">Куратор свяжется с&nbsp;вами в&nbsp;течение дня.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
window.AdoptModal = AdoptModal;
