import { useState, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Pets from './components/Pets';
import Stories from './components/Stories';
import FAQ from './components/FAQ';
import Help from './components/Help';
import Volunteer from './components/Volunteer';
import Contacts from './components/Contacts';
import AdoptModal from './components/AdoptModal';
import Footer from './components/Footer';
import { ToastHost, MobileBar } from './components/Toast';

export default function App() {
  const [adopting, setAdopting] = useState(null);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const closeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Pets onAdopt={setAdopting} />
        <Stories />
        <FAQ />
        <Help onToast={pushToast} />
        <Volunteer onToast={pushToast} />
        <Contacts onToast={pushToast} />
      </main>
      <Footer />
      <AdoptModal pet={adopting} onClose={() => setAdopting(null)} onToast={pushToast} />
      <MobileBar />
      <ToastHost toasts={toasts} onClose={closeToast} />
    </>
  );
}
