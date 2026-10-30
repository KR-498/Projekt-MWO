import { useState, useEffect, useMemo } from 'react';

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

/**
 * Konwertuje dowolny format ceny (number lub string z walutą/przecinkiem) na surową liczbę.
 * @param {number|string|undefined|null} rawValue
 * @returns {number}
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

/**
 * Zwraca efektywną cenę numeryczną pozycji (uwzględnia ewentualną cenę promocyjną).
 * @param {Dish} dish
 * @returns {number}
 */
function getEffectivePrice(dish) {
    const activePrice = dish.promo_price ?? dish.discount_price ?? dish.price;
    return parseNumericPrice(activePrice);
}

export default function Menu() {
    /** @type {[Dish[], Function]} */
    const [dishes, setDishes] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Wszystkie');
    /** @type {[SortOption, Function]} */
    const [sortBy, setSortBy] = useState('default');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                    return (a.name || '').localeCompare(b.name || '', 'pl', {
                        sensitivity: 'base',
                    });

                case 'name-desc':
                    return (b.name || '').localeCompare(a.name || '', 'pl', {
                        sensitivity: 'base',
                    });

                default:
                    return 0;
            }
        });
    }, [dishes, activeCategory, sortBy]);

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
                    <label htmlFor="menu-sort" className="menu__sort-label">
                        Sortuj według:
                    </label>
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
                        {displayedDishes.map((dish) => (
                            <li key={dish.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '1.5rem', alignItems: 'center' }}>
                                <img
                                    src={dish.image_url}
                                    alt={dish.name}
                                    style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                                />
                                <div>
                                    <div className="dish__row">
                                        <h3>{dish.name}</h3>
                                        <div className="dish__line"></div>
                                        <span className="price">{getEffectivePrice(dish).toFixed(2)} zł</span>
                                    </div>
                                    <p>{dish.description}</p>
                                    {dish.tag && <span className="tag">{dish.tag}</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </main>
    );
}
