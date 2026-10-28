import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import Navbar from './Navbar';
import Home from './Home';
import Menu from './Menu';
import About from './About';
import Reservation from './Reservation';
import Kontakt from './Kontakt';

// 1. Wewnętrzny komponent – ma dostęp do useLocation(), bo znajduje się wewnątrz BrowserRouter
function AppContent() {
  const location = useLocation();

  useEffect(() => {
    // Dynamiczne przełączanie klasy 'subpage' na elemencie <body>
    if (location.pathname !== '/') {
      document.body.classList.add('subpage');
    } else {
      document.body.classList.remove('subpage');
    }
  }, [location]);

  return (
      <>
        {/* Pasek nawigacji dla wszystkich podstron poza osią główną / */}
        {location.pathname !== '/' && (
            <div className="shell" style={{ marginTop: '20px' }}>
              <Navbar />
            </div>
        )}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/about" element={<About />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/kontakt" element={<Kontakt />} />
        </Routes>
      </>
  );
}

// 2. Główny komponent – opakowuje całość w BrowserRouter
export default function App() {
  return (
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
  );
}
