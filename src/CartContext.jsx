import { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    // POPRAWKA: Stan przeniesiony do wnętrza komponentu Providera
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Funkcja dodawania do koszyka – przygotowana na strukturę z modalu menu
    const addToCart = (newItem) => {
        setCartItems((prevItems) => {
            // Sprawdzamy, czy identyczna pozycja (to samo ID i te same uwagi) jest już w koszyku
            const existingItemIndex = prevItems.findIndex(
                (item) => item.dish_id === newItem.dish_id && item.special_notes === newItem.special_notes
            );

            if (existingItemIndex > -1) {
                const updatedItems = [...prevItems];
                const existingItem = updatedItems[existingItemIndex];
                
                existingItem.quantity += newItem.quantity;
                existingItem.total_price = existingItem.price * existingItem.quantity;
                
                return updatedItems;
            }

            return [...prevItems, newItem];
        });
    };

    const updateQuantity = (dishId, specialNotes, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(dishId, specialNotes);
            return;
        }

        setCartItems((prevItems) =>
            prevItems.map((item) =>
                item.dish_id === dishId && item.special_notes === specialNotes
                    ? { 
                        ...item, 
                        quantity: newQuantity, 
                     total_price: item.price * newQuantity 
                    }
                    : item
            )
        );
    };

    // Funkcja usuwania pojedynczej pozycji z koszyka
    const removeFromCart = (dishId, specialNotes) => {
        setCartItems((prevItems) =>
            prevItems.filter((item) => !(item.dish_id === dishId && item.special_notes === specialNotes))
        );
    };

    // Czyszczenie koszyka (np. po pomyślnym wysłaniu zamówienia na serwer)
    const clearCart = () => setCartItems([]);

    // Automatyczne przeliczanie sumy całego koszyka
    const cartTotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.total_price, 0);
    }, [cartItems]);

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        updateQuantity,
        cartTotal,
        isCartOpen,
        setIsCartOpen
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart musi być używane wewnątrz CartProvider');
    return context;
}
