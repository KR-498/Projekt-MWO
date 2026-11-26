import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CartProvider } from './CartContext';
import { AuthProvider } from './AuthContext';
import AuthModal from './AuthModal';

import Navbar from './Navbar';
import Home from './Home';
import Menu from './Menu';
import About from './About';
import Reservation from './Reservation';
import Kontakt from './Kontakt';

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/') {
      document.body.classList.add('subpage');
    } else {
      document.body.classList.remove('subpage');
    }
  }, [location]);

  return (
    <>
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

      <AuthModal />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
