import { Link } from 'react-router-dom';
import Navbar from './Navbar';

export default function Home() {
  return (
    <header className="hero">
      
      {/* DODANY KONTENER Z FIGMY, KTÓRY TRZYMA MARGINESY I POZYCJĘ */}
      <div className="shell hero-content">
        
        {/* Umieszczamy Navbar na samej górze kontenera, tak jak wstrzykiwany div w HTML */}
        <Navbar />

        <p className="eyebrow eyebrow--light" style={{ marginTop: '40px' }}>Zapraszamy</p>
        <h1>Tradycja spotyka <em>nowoczesność</em></h1>
        <p className="hero-copy">Odkryj unikalne smaki komponowane z lokalnych, świeżych składników przez naszych mistrzów kuchni.</p>

        {/* KAFLE NAWIGACYJNE */}
        <div className="hero-actions">
          
          {/* Kafel 1: Menu */}
          <Link to="/about" className="hero-action menu-action">
            <span>
              <small>Nasze specjały</small>
              Otwórz Menu
            </span>
            <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>
          </Link>

          {/* Kafel 2: Rezerwacje */}
          <Link to="/reservation" className="hero-action reserve-action">
            <span>
              <small>Wolisz na miejscu?</small>
              Rezerwuj stolik
            </span>
            <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.3" fill="none" /></svg>
          </Link>

        </div>
      </div>
      
      {/* Dolna belka informacyjna */}
      <div className="shell hero-foot">
        <span></span>
        <span>Premium Dining Experience</span>
      </div>
    </header>
  );
}
