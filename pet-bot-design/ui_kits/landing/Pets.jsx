// Pets — 3x2 grid of pet cards. "Хочу забрать" opens the Adopt modal.
function Pets({ onAdopt }) {
  const pets = [
    { id:'barsik', name:'Барсик',   species:'Кот',     sex:'мальчик', age:'2 года',  size:'средний', status:'looking',
      desc:'Серый с белой грудкой. Привит, кастрирован. Ласковый, урчит от прикосновения.', photo:'../../assets/placeholders/pet-3.jpg' },
    { id:'muza',   name:'Муза',     species:'Кошка',   sex:'девочка', age:'1 год',   size:'маленький', status:'looking',
      desc:'Чёрно-белая, найдена во дворе. Играет с&nbsp;клубком часами, отлично ладит с&nbsp;детьми.', photo:'../../assets/placeholders/pet-1.jpg' },
    { id:'rex',    name:'Рэкс',     species:'Пёс',     sex:'мальчик', age:'4 года',  size:'крупный',   status:'looking',
      desc:'Метис овчарки. Ходит на&nbsp;поводке, не&nbsp;тянет. Подойдёт во&nbsp;двор или в&nbsp;квартиру.', photo:'../../assets/placeholders/pet-4.jpg' },
    { id:'pushok', name:'Пушок',    species:'Щенок',   sex:'мальчик', age:'4 мес.',  size:'маленький', status:'reserved',
      desc:'Белый как снег. Готовим документы для&nbsp;переезда к&nbsp;новым хозяевам в&nbsp;Гомель.', photo:'../../assets/placeholders/pet-5.jpg' },
    { id:'tiny',   name:'Тёма',     species:'Котёнок', sex:'мальчик', age:'6 мес.',  size:'маленький', status:'looking',
      desc:'Полосатый, зеленоглазый. Любит смотреть в&nbsp;окно и&nbsp;громко мурлыкать.',                 photo:'../../assets/placeholders/pet-6.jpg' },
    { id:'bella',  name:'Белла',    species:'Кошка',   sex:'девочка', age:'3 года',  size:'средний',   status:'looking',
      desc:'Спасена с&nbsp;улицы. Спокойная, подойдёт в&nbsp;дом без&nbsp;детей или с&nbsp;подростками.',    photo:'../../assets/placeholders/pet-2.jpg' },
  ];

  return (
    <section className="section bg-alt" id="pets">
      <div className="container">
        <div className="section-head">
          <span className="chip">Ищут дом</span>
          <h2>Знакомьтесь — ваши будущие соседи</h2>
          <p className="lead muted">Шесть из&nbsp;284&nbsp;питомцев, которых ведут наши кураторы прямо сейчас. Нажмите «Хочу забрать»&nbsp;— куратор свяжется с&nbsp;вами в&nbsp;течение дня.</p>
        </div>
        <div className="pets-grid">
          {pets.map((p) => (
            <article key={p.id} className="pet-card card">
              <div className="pet-photo">
                <img src={p.photo} alt={p.name}/>
                {p.status === 'reserved' && <span className="pet-status">Забронирован</span>}
              </div>
              <div className="pet-body">
                <div className="pet-head">
                  <h3 className="pet-name">{p.name}</h3>
                  <span className="pet-meta">{p.species} · {p.sex}</span>
                </div>
                <div className="pet-attrs">
                  <span>{p.age}</span>
                  <span className="dot-sep">·</span>
                  <span>{p.size}</span>
                </div>
                <p className="muted pet-desc" dangerouslySetInnerHTML={{__html:p.desc}}/>
                <button
                  className="btn btn-primary btn-sm pet-cta"
                  onClick={() => onAdopt && onAdopt(p)}
                  disabled={p.status === 'reserved'}
                >
                  <span>{p.status === 'reserved' ? 'Забронирован' : 'Хочу забрать'}</span>
                  {p.status === 'looking' && <span dangerouslySetInnerHTML={{__html: window.PetIcons.arrowRight}}/>}
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="pets-foot">
          <span className="muted">Скоро&nbsp;— полный каталог с&nbsp;фильтрами по&nbsp;городу, возрасту и&nbsp;характеру.</span>
        </div>
      </div>
    </section>
  );
}
window.Pets = Pets;
