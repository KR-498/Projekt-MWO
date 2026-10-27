import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Home from './Home';
import Reservation from './Reservation';
import About from './About'; // <-- 1. Importujemy naszą sekcję O nas
import Kontakt from './Kontakt';

function AppContent() {
  const location = useLocation();

  // Dynamiczne zarządzanie klasą subpage na body
  useEffect(() => {
    if (location.pathname === '/') {
      document.body.classList.remove('subpage');
    } else {
      document.body.classList.add('subpage');
    }
  }, [location]);

  return (
    <>
      {/* Jeśli NIE jesteśmy na stronie głównej, renderujemy standardowy jasny nagłówek */}
      {location.pathname !== '/' && (
        <div className="shell" style={{ marginTop: '40px' }}>
          <Navbar />
        </div>
      )}

      {/* Dynamiczna treść podmieniająca się w zależności od adresu URL */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} /> {/* <-- 2. Podmieniamy tutaj */}
        <Route path="/reservation" element={<Reservation />} />
        <Route path="/kontakt" element={<Kontakt />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
