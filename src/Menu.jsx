import { useState, useEffect, useMemo } from 'react';
import { useCart } from './CartContext'; // Upewnij się, że ścieżka jest prawidłowa

/**
 * @typedef {Object} Dish
 * @property {number} id
 * @property {string} name
 * @property {string} [description]
 * @property {number|string} price
 * @property {number|string} [promo_price]
 * @property {number|string} [discount_price]
 * @property {string} [tag]
 * @property {boolean} [is_available]
 * @property {string} [image_url]
 * @property {string} category_name
 * @property {number} [display_order]
 */

/**
 * @typedef {'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'} SortOption
 */

function parseNumericPrice(rawValue) {
    if (typeof rawValue === 'number' && !Number.isNaN(rawValue)) {
        return rawValue;
    }
    if (typeof rawValue === 'string') {
        const normalized = rawValue.replace(',', '.').replace(/[^\d.-]/g, '');
        const parsed = Number.parseFloat(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

function getEffectivePrice(dish) {
    const activePrice = dish.promo_price ?? dish.discount_price ?? dish.price;
    return parseNumericPrice(activePrice);
}

export default function Menu() {
    const [dishes, setDishes] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Wszystkie');
    const [sortBy, setSortBy] = useState('default');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // PODPIĘCIE GLOBALNEGO KOSZYKA
    const { addToCart, cartItems } = useCart();

    // PODGLĄD DEWELOPERSKI W KONSOLI (F12) - Zobaczysz na żywo dodawane potrawy
    console.log('Zawartość koszyka:', cartItems);

    // STAN DLA AKTYWNEGO ELEMENTU HOVER (Ultra płynny ruch)
    const [hoveredDishId, setHoveredDishId] = useState(null);

    // STANY MODALU KONFIGURACJI ZAMAWIANIA
    const [selectedDish, setSelectedDish] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetch('http://localhost:5000/api/dishes')
            .then((res) => {
                if (!res.ok) throw new Error('Błąd połączenia z serwerem');
                return res.json();
            })
            .then((data) => {
                setDishes(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const categories = useMemo(
        () => ['Wszystkie', ...new Set(dishes.map((d) => d.category_name))],
        [dishes]
    );

    const displayedDishes = useMemo(() => {
        const filtered = activeCategory === 'Wszystkie'
            ? dishes
            : dishes.filter((d) => d.category_name === activeCategory);

        if (sortBy === 'default') {
            return filtered;
        }

        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'price-asc':
                    return getEffectivePrice(a) - getEffectivePrice(b);
                case 'price-desc':
                    return getEffectivePrice(b) - getEffectivePrice(a);
                case 'name-asc':
                    return (a.name || '').localeCompare(b.name || '', 'pl', { sensitivity: 'base' });
                case 'name-desc':
                    return (b.name || '').localeCompare(b.name || '', 'pl', { sensitivity: 'base' });
                default:
                    return 0;
            }
        });
    }, [dishes, activeCategory, sortBy]);

    const handleOpenOrdering = (dish) => {
        setSelectedDish(dish);
        setQuantity(1);
        setNotes('');
    };

    const handleConfirmOrder = () => {
        const orderPayload = {
            dish_id: selectedDish.id,
            name: selectedDish.name,
            price: getEffectivePrice(selectedDish),
            quantity: quantity,
            special_notes: notes,
            total_price: getEffectivePrice(selectedDish) * quantity
        };

        // ZAPISANIE POZYCJI W GLOBALNYM KOSZYKU CONTEXTU
        addToCart(orderPayload);
        setSelectedDish(null); 
    };

    if (loading) return <div className="container section center"><p>Ładowanie menu...</p></div>;
    if (error) return <div className="container section center"><p style={{ color: 'red' }}>Błąd: {error}</p></div>;
    return (
        <main className="section">
            <div className="container">
                <header className="center" style={{ marginBottom: '3rem' }}>
                    <p className="eyebrow">Tradycja i Smak</p>
                    <h2>Karta Dań</h2>
                    <p className="menu__intro">
                        Wszystkie potrawy przygotowujemy ze świeżych, lokalnych produktów według tradycyjnych włoskich receptur.
                    </p>
                </header>

                <div className="tabs">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            className={`tab ${activeCategory === cat ? 'is-active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="menu__controls">
                    <label htmlFor="menu-sort" className="menu__sort-label">Sortuj według:</label>
                    <select
                        id="menu-sort"
                        className="menu__sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="default">Domyślnie (kolejność w karcie)</option>
                        <option value="price-asc">Cena: od najniższej</option>
                        <option value="price-desc">Cena: od najwyższej</option>
                        <option value="name-asc">Nazwa: A–Z</option>
                        <option value="name-desc">Nazwa: Z–A</option>
                    </select>
                </div>

                <div className="panel">
                    <ul className="dishes">
                        {displayedDishes.map((dish) => {
                            const isHovered = hoveredDishId === dish.id;
                            return (
                                <li 
                                    key={dish.id} 
                                    onClick={() => handleOpenOrdering(dish)}
                                    onMouseEnter={() => setHoveredDishId(dish.id)}
                                    onMouseLeave={() => setHoveredDishId(null)}
                                    style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: '100px 1fr', 
                                        gap: '1.5rem', 
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        backgroundColor: isHovered ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                                        borderRadius: '6px',
                                        transform: isHovered ? 'translateX(8px)' : 'translateX(0)',
                                        willChange: 'transform',
                                        transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.3s ease'
                                    }}
                                >
                                    <img
                                        src={dish.image_url}
                                        alt={dish.name}
                                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                    <div>
                                        <div className="dish__row">
                                            <h3 style={{ 
                                                opacity: isHovered ? 0.8 : 1, 
                                                transition: 'opacity 0.2s ease' 
                                            }}>
                                                {dish.name}
                                            </h3>
                                            <div className="dish__line"></div>
                                            <span className="price">{getEffectivePrice(dish).toFixed(2)} zł</span>
                                        </div>
                                        <p>{dish.description}</p>
                                        {dish.tag && <span className="tag">{dish.tag}</span>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* INTERFEJS ZAMAWIANIA (MODAL) */}
            {selectedDish && (
                <div className="menu-modal-overlay" onClick={() => setSelectedDish(null)}>
                    <div className="menu-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="menu-modal-close" onClick={() => setSelectedDish(null)}>×</button>
                        
                        <h3>Konfiguracja zamówienia</h3>
                        <h2 style={{ margin: '0.5rem 0' }}>{selectedDish.name}</h2>
                        <p className="price" style={{ fontSize: '1.25rem' }}>
                            {(getEffectivePrice(selectedDish) * quantity).toFixed(2)} zł
                        </p>

                        <div className="menu-modal-form-group">
                            <label>Ilość porcji:</label>
                            <div className="quantity-selector">
                                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
                                <span>{quantity}</span>
                                <button type="button" onClick={() => setQuantity(q => q + 1)}>+</button>
                            </div>
                        </div>

                        <div className="menu-modal-form-group">
                            <label htmlFor="order-notes">Uwagi do kucharza (np. bez cebuli):</label>
                            <textarea 
                                id="order-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Wpisz swoje życzenia..."
                                rows={3}
                            />
                        </div>

                        <button className="menu-modal-submit-btn" onClick={handleConfirmOrder}>
                            Dodaj do zamówienia
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
