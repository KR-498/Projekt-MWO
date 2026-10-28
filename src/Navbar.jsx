import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <header id="hednav">
      <div className="site-brand">
        <button className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>WSPANIAŁY TYTUŁ</strong>
            <small>RESTAURACJA</small>
          </div>
        </button>
      </div>
      <nav className="nav">
        <div className="nav-links">    
          <NavLink to="/" end className={({ isActive }) => isActive ? "nav-reserve" : ""}>Główna</NavLink>
          <NavLink to="/about" className={({ isActive }) => isActive ? "nav-reserve" : ""}>O nas</NavLink>
          <NavLink to="/reservation" className={({ isActive }) => isActive ? "nav-reserve" : ""}>Rezerwacje</NavLink>
          <NavLink to="/kontakt" className={({ isActive }) => isActive ? "nav-reserve" : ""}>Kontakt</NavLink>
        </div>
      </nav>
    </header>
  );
}
