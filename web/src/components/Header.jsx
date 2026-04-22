import { useState, useEffect } from 'react';
import { icons } from '../icons';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const links = [
    { href: '#pets',      label: 'Питомцы' },
    { href: '#stories',   label: 'Истории' },
    { href: '#help',      label: 'Помочь' },
    { href: '#volunteer', label: 'Стать помощником' },
    { href: '#contacts',  label: 'Контакты' },
  ];
  return (
    <header className={'site-header' + (scrolled ? ' scrolled' : '')}>
      <div className="container header-inner">
        <a href="#top" className="brand-lockup">
          <img src="/assets/logo-mark.svg" alt="" width="40" height="40" />
          <span className="brand-word">Pet <b>Help</b></span>
        </a>
        <nav className={'nav' + (open ? ' open' : '')}>
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
        </nav>
        <a href="#pets" className="btn btn-primary btn-sm header-cta">
          <span dangerouslySetInnerHTML={{ __html: icons.paw }} />
          <span>Посмотреть питомцев</span>
        </a>
        <button className="burger" aria-label="Меню" onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}
