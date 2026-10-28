import { useState, useEffect } from 'react';

export default function Menu() {
    const [dishes, setDishes] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Wszystkie');
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

    const categories = ['Wszystkie', ...new Set(dishes.map((d) => d.category_name))];

    const filteredDishes = activeCategory === 'Wszystkie'
        ? dishes
        : dishes.filter((d) => d.category_name === activeCategory);

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
                            className={`tab ${activeCategory === cat ? 'is-active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="panel">
                    <ul className="dishes">
                        {filteredDishes.map((dish) => (
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
                                        <span className="price">{Number(dish.price).toFixed(2)} zł</span>
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