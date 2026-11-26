import { useState } from 'react';
import { useCart } from './CartContext';
import { useEffect } from 'react';
import { useAuth } from './AuthContext';

export default function CartSidebar() {
    const { cartItems, cartTotal, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, clearCart } = useCart();
    const { user, token } = useAuth();

    // Automatyczne uzupełnianie danych zalogowanego użytkownika przy otwarciu koszyka
    useEffect(() => {
        if (user) {
            if (user.name) setCustomerName(user.name);
            if (user.email) setCustomerEmail(user.email);
            if (user.phone) {
                // Wyciągamy same cyfry bez kierunkowego (+48) i formatujemy po 3 znaki
                const digitsOnly = user.phone.replace(/^\+\d{1,3}\s*/, '').replace(/\D/g, '').slice(0, 9);
                const formatted = digitsOnly.match(/.{1,3}/g)?.join(' ') || '';
                if (formatted) setCustomerPhone(formatted);
            }
            if (user.default_street) setDeliveryStreet(user.default_street);
            if (user.default_city) setDeliveryCity(user.default_city);
        }
    }, [user, isCartOpen]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const today = new Date().toISOString().split('T')[0];
    const [deliveryType, setDeliveryType] = useState('pickup');
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
        const [phonePrefix, setPhonePrefix] = useState('+48');
    const [customPrefix, setCustomPrefix] = useState('+');

    const handleCustomPrefixChange = (e) => {
        const raw = e.target.value;
        const digits = raw.replace(/\D/g, '').slice(0, 3);
        if (digits.length > 0) {
            setCustomPrefix(`+${digits}`);
        } else if (raw.startsWith('+')) {
            setCustomPrefix('+');
        } else {
            setCustomPrefix('');
        }
    };

    const handlePhoneChange = (e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
        const formatted = digits.match(/.{1,3}/g)?.join(' ') || '';
        setCustomerPhone(formatted);
    };

    const [deliveryStreet, setDeliveryStreet] = useState('');
    const [deliveryCity, setDeliveryCity] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [scheduledDate, setScheduledDate] = useState(today);
    const [scheduledTime, setScheduledTime] = useState('18:30');
    const [hoursInfo, setHoursInfo] = useState(null);

    useEffect(() => {
        if (!scheduledDate) return;

        const fetchKitchenHours = () => {
            fetch(`http://localhost:4000/api/kitchen-hours?date=${scheduledDate}`)
                .then((res) => res.json())
                .then((data) => setHoursInfo(data))
                .catch(() => setHoursInfo(null));
        };

        fetchKitchenHours();
        window.addEventListener('opening-hours-updated', fetchKitchenHours);
        return () => window.removeEventListener('opening-hours-updated', fetchKitchenHours);
    }, [scheduledDate]);


    if (!isCartOpen) return null;

    const safeCartItems = cartItems || [];
    const deliveryFee = (deliveryType === 'delivery' && cartTotal < 150) ? 15.00 : 0.00;
    const finalTotal = cartTotal + deliveryFee;
        // Sprawdzanie na żywo, czy wybrana data i godzina są poprawne
    const getTimeValidationError = () => {
        if (!scheduledDate || !scheduledTime) return 'Wybierz dzień i godzinę realizacji.';
        if (!hoursInfo) return null; // Czekamy na odpowiedź z serwera

        if (hoursInfo.isClosed) {
            return 'W tym dniu restauracja jest zamknięta.';
        }

        // 1. Sprawdzenie bufora 45 minut od teraz
        const [year, month, day] = scheduledDate.split('-').map(Number);
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const targetDate = new Date(year, month - 1, day, hours, minutes, 0);
        const minPrepTime = new Date(Date.now() + 45 * 60 * 1000);

        if (targetDate < minPrepTime) {
            return 'Wybrany termin minął lub jest za wcześnie (wymagane min. 45 min na przygotowanie).';
        }

        // 2. Sprawdzenie czy godzina mieści się w godzinach pracy kuchni (open - lastOrder)
        const toMinutes = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const reqMins = toMinutes(scheduledTime);
        const openMins = toMinutes(hoursInfo.open);
        const lastOrderMins = toMinutes(hoursInfo.lastOrder);

        if (reqMins < openMins || reqMins > lastOrderMins) {
            return `Godzina poza zakresem pracy kuchni (${hoursInfo.open}–${hoursInfo.lastOrder}).`;
        }

        return null; // Wszystko poprawne
    };

    const timeValidationError = getTimeValidationError();


    const handleOrderSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg(null);
        if (safeCartItems.length === 0) return;

        setIsSubmitting(true);
        const activePrefix =
            phonePrefix === 'other'
                ? customPrefix.trim().startsWith('+')
                    ? customPrefix.trim()
                    : `+${customPrefix.trim()}`
                : phonePrefix;
        const rawPhone = customerPhone.trim();
        const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${activePrefix} ${rawPhone}`;

        const orderPayload = {
            items: safeCartItems,
            customerName,
            customerEmail,
            customerPhone: fullPhone,
            deliveryType,
            deliveryStreet,
            deliveryCity,
            deliveryNotes,
            scheduledDate,
            scheduledTime
        };

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('http://localhost:4000/api/orders', {
                method: 'POST',
                headers,
                body: JSON.stringify(orderPayload)
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Dziękujemy, ${customerName}! Zamówienie nr ${data.orderId} zostało przyjęte na ${scheduledDate} o godz. ${scheduledTime}.`);
                clearCart();
                setIsCartOpen(false);
            } else {
                setErrorMsg(data.error || 'Nie udało się złożyć zamówienia.');
            }
        } catch (error) {
            console.error('Błąd sieci:', error);
            setErrorMsg('Błąd połączenia z serwerem. Upewnij się, że backend działa.');
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
                        <>
                            <ul className="cart-sidebar__list">
                                {safeCartItems.map((item, index) => (
                                    <li key={`${item.dish_id}-${index}`} className="cart-sidebar__item">
                                        <div className="cart-sidebar__item-info">
                                            <h4>{item.name}</h4>
                                            <div className="cart-sidebar__qty-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                                                <button type="button" onClick={() => updateQuantity(item.dish_id, item.special_notes, item.quantity - 1)} disabled={isSubmitting}>-</button>
                                                <span>{item.quantity}</span>
                                                <button type="button" onClick={() => updateQuantity(item.dish_id, item.special_notes, item.quantity + 1)} disabled={isSubmitting}>+</button>
                                            </div>
                                            {item.special_notes && <p className="cart-sidebar__item-notes">„{item.special_notes}”</p>}
                                        </div>
                                        <div className="cart-sidebar__item-actions">
                                            <span>{item.total_price.toFixed(2)} zł</span>
                                            <button type="button" onClick={() => removeFromCart(item.dish_id, item.special_notes)} className="cart-sidebar__delete-btn" disabled={isSubmitting}>🗑️</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <form id="order-planning-form" onSubmit={handleOrderSubmit} className="cart-planning">
                                <h3 className="cart-planning__title">Sposób i czas realizacji</h3>

                                <div className="cart-planning__toggle">
                                    <button
                                        type="button"
                                        className={`toggle-btn ${deliveryType === 'pickup' ? 'active' : ''}`}
                                        onClick={() => setDeliveryType('pickup')}
                                    >
                                        Odbiór osobisty
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${deliveryType === 'delivery' ? 'active' : ''}`}
                                        onClick={() => setDeliveryType('delivery')}
                                    >
                                        Dostawa
                                    </button>
                                </div>

                                {deliveryType === 'delivery' && (
                                    <div className="cart-planning__delivery-box">
                                        <p className="delivery-info-banner">
                                            {cartTotal >= 150
                                                ? '🎉 Darmowa dostawa (zamówienie powyżej 150 zł)'
                                                : `Koszt dostawy: 15.00 zł (brakuje ${(150 - cartTotal).toFixed(2)} zł do darmowej)`}
                                        </p>

                                        <div className="cart-planning__group">
                                            <label htmlFor="delivery-street">Ulica i numer domu/mieszkania *</label>
                                            <input
                                                id="delivery-street"
                                                type="text"
                                                placeholder="np. ul. Włoska 12/4"
                                                value={deliveryStreet}
                                                onChange={(e) => setDeliveryStreet(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="cart-planning__group">
                                            <label htmlFor="delivery-city">Kod pocztowy i miasto *</label>
                                            <input
                                                id="delivery-city"
                                                type="text"
                                                placeholder="np. 33-132 Niedomice"
                                                value={deliveryCity}
                                                onChange={(e) => setDeliveryCity(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="cart-planning__group">
                                            <label htmlFor="delivery-notes">Uwagi dla kuriera (opcjonalnie)</label>
                                            <input
                                                id="delivery-notes"
                                                type="text"
                                                placeholder="np. kod do domofonu 123, II piętro"
                                                value={deliveryNotes}
                                                onChange={(e) => setDeliveryNotes(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="cart-planning__row">
                                    <div className="cart-planning__group">
                                        <label htmlFor="scheduled-date">Dzień *</label>
                                        <input
                                            id="scheduled-date"
                                            type="date"
                                            min={today}
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="cart-planning__group">
                                        <label htmlFor="scheduled-time">Godzina *</label>
                                        <input
                                            id="scheduled-time"
                                            type="time"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                {hoursInfo && (
                                    <p className={`cart-planning__hours-hint ${timeValidationError ? 'is-closed' : ''}`}>
                                        {timeValidationError
                                            ? `⚠️ ${timeValidationError}`
                                            : `🕒 Kuchnia przyjmuje zamówienia w godz. ${hoursInfo.open}–${hoursInfo.lastOrder} (min. 45 min wyprzedzenia).`}
                                    </p>
                                )}

                                <h3 className="cart-planning__title" style={{ marginTop: '1rem' }}>Dane kontaktowe</h3>

                                <div className="cart-planning__group">
                                    <label htmlFor="customer-name">Imię i nazwisko *</label>
                                    <input
                                        id="customer-name"
                                        type="text"
                                        placeholder="Jan Kowalski"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="cart-planning__group">
                                    <label htmlFor="customer-phone">Telefon *</label>
                                    <div
                                        className="cart-planning__phone-grid"
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: phonePrefix === 'other' ? '115px 75px 1fr' : '115px 1fr',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <select
                                            id="cart-phone-prefix"
                                            value={phonePrefix}
                                            onChange={(e) => setPhonePrefix(e.target.value)}
                                            aria-label="Kierunkowy kraju"
                                        >
                                            <option value="+48">🇵🇱 +48</option>
                                            <option value="+49">🇩🇪 +49</option>
                                            <option value="+44">🇬🇧 +44</option>
                                            <option value="+39">🇮🇹 +39</option>
                                            <option value="+380">🇺🇦 +380</option>
                                            <option value="+420">🇨🇿 +420</option>
                                            <option value="+421">🇸🇰 +421</option>
                                            <option value="+33">🇫🇷 +33</option>
                                            <option value="+34">🇪🇸 +34</option>
                                            <option value="+1">🇺🇸 +1</option>
                                            <option value="other">Inny</option>
                                        </select>
                                        {phonePrefix === 'other' && (
                                            <input
                                                type="text"
                                                value={customPrefix}
                                                onChange={handleCustomPrefixChange}
                                                placeholder="+..."
                                                maxLength={4}
                                                pattern="\+\d{1,3}"
                                                title="Znak + oraz od 1 do 3 cyfr (np. +351)"
                                                aria-label="Własny prefiks kraju"
                                                required
                                            />
                                        )}
                                        <input
                                            id="customer-phone"
                                            type="tel"
                                            value={customerPhone}
                                            onChange={handlePhoneChange}
                                            placeholder="600 700 800"
                                            autoComplete="tel-national"
                                            maxLength={11}
                                            pattern="[\d\s()\-]{6,15}"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="cart-planning__group">
                                    <label htmlFor="customer-email">E-mail (opcjonalnie)</label>
                                    <input
                                        id="customer-email"
                                        type="email"
                                        placeholder="jan@domena.pl"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                    />
                                </div>


                                {errorMsg && (
                                    <p className="cart-planning__error">{errorMsg}</p>
                                )}
                            </form>
                        </>
                    )}
                </div>

                {safeCartItems.length > 0 && (
                    <div className="cart-sidebar__footer">
                        {deliveryType === 'delivery' && (
                            <div className="cart-sidebar__sub-row">
                                <span>Dostawa:</span>
                                <span>{deliveryFee === 0 ? 'Gratis' : `${deliveryFee.toFixed(2)} zł`}</span>
                            </div>
                        )}
                        <div className="cart-sidebar__total">
                            <span>Razem do zapłaty:</span>
                            <strong>{finalTotal.toFixed(2)} zł</strong>
                        </div>
                        <button
                            type="submit"
                            form="order-planning-form"
                            className="cart-sidebar__submit-btn"
                            disabled={isSubmitting || Boolean(timeValidationError)}
                        >
                            {isSubmitting ? 'Przetwarzanie...' : 'Zamów i zapłać'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
