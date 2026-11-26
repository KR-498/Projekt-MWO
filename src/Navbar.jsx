import { NavLink } from 'react-router-dom';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import CartSidebar from './CartSidebar';
import logo from './assets/logo.png'; 
export default function Navbar() {
    const { cartItems, setIsCartOpen } = useCart();
    const { user, isAuthenticated, isAdmin, setIsAuthModalOpen, setIsAdminSettingsOpen, logout } = useAuth();

    const totalItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    return (
        <header id="hednav">
            <div className="site-brand">
                <NavLink to="/" className="brand" style={{ textDecoration: 'none' }}>
                    {/* LOGO */}
                    <img 
                        src={logo} 
                        alt="Sapore & Amore Logo" 
                        className="brand-logo" 
                    />
                    <div>
                        {/* SEKCJA NAZWY */}
                        <strong>SAPORE & AMORE</strong>
                        <small>RISTORANTE ITALIANO</small>
                    </div>
                </NavLink>
            </div>

            <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div className="nav-links">
                    <NavLink to="/" end className={({ isActive }) => isActive ? "nav-reserve" : ""}>Główna</NavLink>
                    <NavLink to="/menu" className={({ isActive }) => isActive ? "nav-reserve" : ""}>Menu</NavLink>
                    <NavLink to="/about" className={({ isActive }) => isActive ? "nav-reserve" : ""}>O&nbsp;nas</NavLink>
                    <NavLink to="/reservation" className={({ isActive }) => isActive ? "nav-reserve" : ""}>Rezerwacje</NavLink>
                    <NavLink to="/kontakt" className={({ isActive }) => isActive ? "nav-reserve" : ""}>Kontakt</NavLink>
                </div>

                {/* SEKCJA KONTA UŻYTKOWNIKA */}
                {isAuthenticated ? (
                    <div className="nav-user">
                        <span className="nav-user__greeting">
                            Cześć, <strong>{user.name.split(' ').at(0)}</strong>
                            {isAdmin && <span className="nav-user__badge">Admin</span>}
                        </span>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setIsAdminSettingsOpen(true)}
                                className="nav-admin-settings-btn"
                                title="Ustawienia godzin otwarcia"
                                aria-label="Ustawienia godzin otwarcia"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    width="18"
                                    height="18"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={logout}
                            className="nav-user__logout"
                        >
                            Wyloguj
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="nav-login-btn"
                    >
                        Zaloguj
                    </button>
                )}

                {/* PRZYCISK OTWIERAJĄCY PANEL KOSZYKA */}
                <button 
                    className="navbar-cart-btn" 
                    onClick={() => setIsCartOpen(true)}
                    style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', padding: '5px' }}
                >
                    🛒
                    {totalItemsCount > 0 && (
                        <span className="navbar-cart-badge">
                            {totalItemsCount}
                        </span>
                    )}
                </button>
            </nav>

            <CartSidebar />
        </header>
    );
}