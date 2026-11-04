import { useState } from 'react';
import { useCart } from './CartContext';

export default function CartSidebar() {
    // Pobieramy dodatkowo funkcję clearCart do czyszczenia koszyka po zamówieniu
    const { cartItems, cartTotal, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, clearCart } = useCart();
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isCartOpen) return null;

    const safeCartItems = cartItems || [];

    // Funkcja wysyłająca dane na serwer
    const handleOrderSubmit = async () => {
        if (safeCartItems.length === 0) return;

        setIsSubmitting(true);

        // Przygotowanie paczki danych zgodnie z oczekiwaniami backendu
        const orderPayload = {
            items: safeCartItems,
            totalPrice: cartTotal
        };

        try {
            const response = await fetch('http://localhost:5000/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderPayload)
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Sukces! Zamówienie zostało złożone. Numer zamówienia: ${data.orderId}`);
                clearCart(); // Czyszczenie koszyka na froncie
                setIsCartOpen(false); // Zamknięcie koszyka
            } else {
                alert(`Błąd: ${data.error || 'Nie udało się złożyć zamówienia.'}`);
            }
        } catch (error) {
            console.error('Błąd sieci:', error);
            alert('Błąd połączenia z serwerem. Upewnij się, że backend działa.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
            <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
                <div className="cart-sidebar__header">
                    <h2>Twój koszyk</h2>
                    <button className="cart-sidebar__close" onClick={() => setIsCartOpen(false)}>×</button>
                </div>

                <div className="cart-sidebar__content">
                    {safeCartItems.length === 0 ? (
                        <p className="cart-sidebar__empty">Koszyk jest pusty. Dodaj pyszne potrawy z menu!</p>
                    ) : (
                        <ul className="cart-sidebar__list">
                            {safeCartItems.map((item, index) => (
                                <li key={`${item.dish_id}-${index}`} className="cart-sidebar__item">
                                    <div className="cart-sidebar__item-info">
                                        <h4>{item.name}</h4>
                                        
                                        <div className="cart-sidebar__qty-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                                            <button 
                                                type="button" 
                                                onClick={() => updateQuantity(item.dish_id, item.special_notes, item.quantity - 1)}
                                                style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #ccc', background: '#fff', borderRadius: '4px' }}
                                                disabled={isSubmitting}
                                            >
                                                -
                                            </button>
                                            <span style={{ fontWeight: '600', minWidth: '18px', textAlign: 'center' }}>{item.quantity}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => updateQuantity(item.dish_id, item.special_notes, item.quantity + 1)}
                                                style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #ccc', background: '#fff', borderRadius: '4px' }}
                                                disabled={isSubmitting}
                                            >
                                                +
                                            </button>
                                        </div>

                                        {item.special_notes && (
                                            <p className="cart-sidebar__item-notes">„{item.special_notes}”</p>
                                        )}
                                    </div>
                                    <div className="cart-sidebar__item-actions">
                                        <span>{item.total_price.toFixed(2)} zł</span>
                                        <button 
                                            onClick={() => removeFromCart(item.dish_id, item.special_notes)}
                                            className="cart-sidebar__delete-btn"
                                            title="Usuń pozycję"
                                            disabled={isSubmitting}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {safeCartItems.length > 0 && (
                    <div className="cart-sidebar__footer">
                        <div className="cart-sidebar__total">
                            <span>Razem do zapłaty:</span>
                            <strong>{cartTotal.toFixed(2)} zł</strong>
                        </div>
                        <button 
                            className="cart-sidebar__submit-btn"
                            onClick={handleOrderSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Wysyłanie zamówienia...' : 'Zamów i zapłać'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
