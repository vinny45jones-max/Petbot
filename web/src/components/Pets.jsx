import { icons } from '../icons';

const pets = [
  { id: 'barsik', name: 'Барсик', species: 'Кот', sex: 'мальчик', age: '2 года', size: 'средний', status: 'looking',
    tags: ['привит', 'любит руки'],
    desc: 'Серый с&nbsp;белой грудкой. Кастрирован, лоток на&nbsp;отлично. Урчит, как только сядете рядом — ищет спокойный дом без&nbsp;других котов.',
    photo: '/assets/placeholders/pet-3.jpg' },
  { id: 'muza', name: 'Муза', species: 'Кошка', sex: 'девочка', age: '1 год', size: 'маленький', status: 'looking',
    tags: ['ладит с детьми', 'игручая'],
    desc: 'Чёрно-белая, найдена во&nbsp;дворе подростком. Гоняет фантик часами, спит у&nbsp;ног. Подойдёт активной семье, в&nbsp;т.&nbsp;ч.&nbsp;с&nbsp;детьми.',
    photo: '/assets/placeholders/pet-4.jpg' },
  { id: 'rex', name: 'Рэкс', species: 'Пёс', sex: 'мальчик', age: '4 года', size: 'крупный', status: 'looking',
    tags: ['нужен опыт', 'во двор'],
    desc: 'Метис овчарки. Послушный с&nbsp;тем, кому доверяет, но&nbsp;настороженно встречает чужих. Ищем хозяина с&nbsp;опытом крупных собак.',
    photo: '/assets/placeholders/pet-1.jpg' },
  { id: 'pushok', name: 'Пушок', species: 'Щенок', sex: 'мальчик', age: '4 мес.', size: 'маленький', status: 'reserved',
    tags: ['в семью'],
    desc: 'Белый, как снег. Уже едет к&nbsp;новым хозяевам в&nbsp;Гомель — место занято, но&nbsp;ждём вас на&nbsp;других щенков из&nbsp;того&nbsp;же помёта.',
    photo: '/assets/placeholders/pet-5.jpg' },
  { id: 'tema', name: 'Тёма', species: 'Котёнок', sex: 'мальчик', age: '6 мес.', size: 'маленький', status: 'looking',
    tags: ['к коту-другу'],
    desc: 'Полосатый, зеленоглазый. Социализирован среди других котов, рекомендуем брать в&nbsp;семью, где уже есть кошачий друг.',
    photo: '/assets/placeholders/pet-6.jpg' },
  { id: 'bella', name: 'Белла', species: 'Кошка', sex: 'девочка', age: '3 года', size: 'средний', status: 'looking',
    tags: ['пугливая', 'нужно терпение'],
    desc: 'Спасена с&nbsp;улицы, первое время будет прятаться. К&nbsp;человеку привыкает за&nbsp;2–3&nbsp;недели. Только взрослая семья без&nbsp;других животных.',
    photo: '/assets/placeholders/pet-2.jpg' },
];

export default function Pets({ onAdopt }) {
  return (
    <section className="section bg-alt" id="pets">
      <div className="container">
        <div className="section-head">
          <span className="chip">Ищут дом</span>
          <h2>Знакомьтесь — ваши будущие соседи</h2>
          <p className="lead muted">Шесть из&nbsp;284&nbsp;питомцев, которых ведут наши кураторы прямо сейчас. Каждого мы&nbsp;опишем честно — характер, ограничения, кому подойдёт.</p>
        </div>
        <div className="pets-grid">
          {pets.map((p) => (
            <article key={p.id} className="pet-card card">
              <div className="pet-photo">
                <img src={p.photo} alt={`${p.name} — ${p.species.toLowerCase()}, ${p.age}, ищет дом`} />
                {p.status === 'reserved' && <span className="pet-status">Забронирован</span>}
              </div>
              <div className="pet-body">
                <div className="pet-head">
                  <h3 className="pet-name">{p.name}</h3>
                  <span className="pet-meta">{p.species} · {p.sex}</span>
                </div>
                <div className="pet-attrs">
                  <span>{p.age}</span><span className="dot-sep">·</span><span>{p.size}</span>
                </div>
                <div className="pet-tags">
                  {p.tags.map((t, i) => <span key={i} className="pet-tag">{t}</span>)}
                </div>
                <p className="muted pet-desc" dangerouslySetInnerHTML={{ __html: p.desc }} />
                <button
                  className="btn btn-primary btn-sm pet-cta"
                  onClick={() => onAdopt && onAdopt(p)}
                  disabled={p.status === 'reserved'}
                >
                  <span>{p.status === 'reserved' ? 'Забронирован' : 'Хочу забрать'}</span>
                  {p.status === 'looking' && <span dangerouslySetInnerHTML={{ __html: icons.arrowRight }} />}
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="pets-foot">
          <span className="muted">Скоро — полный каталог с&nbsp;фильтрами по&nbsp;городу, возрасту и&nbsp;характеру.</span>
        </div>
      </div>
    </section>
  );
}
