import { NavLink } from 'react-router-dom';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import CartSidebar from './CartSidebar';
import logo from './assets/logo.png'; 
export default function Navbar() {
    const { cartItems, setIsCartOpen } = useCart();
    const { user, isAuthenticated, isAdmin, setIsAuthModalOpen, logout } = useAuth();

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