import { NavLink } from 'react-router-dom';
import { useCart } from './CartContext'; // Upewnij się, że ścieżka jest poprawna
import CartSidebar from './CartSidebar'; // Komponent, który stworzymy za chwilę

export default function Navbar() {
    const { cartItems, setIsCartOpen } = useCart();

    const totalItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);

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
            <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div className="nav-links">
                    <NavLink to="/" end className={({ isActive }) => isActive ? "nav-reserve" : ""}>Główna</NavLink>
                    <NavLink to="/menu" className={({ isActive }) => isActive ? "nav-reserve" : ""}>Menu</NavLink>
                    <NavLink to="/about" className={({ isActive }) => isActive ? "nav-reserve" : ""}>O&nbsp;nas</NavLink>
                    <NavLink to="/reservation" className={({ isActive }) => isActive ? "nav-reserve" : ""}>Rezerwacje</NavLink>
                    <NavLink to="/kontakt" className={({ isActive }) => isActive ? "nav-reserve" : ""}>Kontakt</NavLink>
                </div>

                {/* PRZYCISK OTWIERAJĄCY PANEL */}
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

            {/* KOMPONENT WYSOWANEGO KOSZYKA */}
            <CartSidebar />
        </header>
    );
}
