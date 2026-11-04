import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Połączenie z baza danych na Neon.tech
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.get('/api/dishes', async (req, res) => {
    try {
        const query = `
            SELECT
                d.id,
                d.name,
                d.description,
                d.price,
                d.tag,
                d.is_available,
                d.image_url,
                c.name AS category_name,
                c.display_order
            FROM dishes d
                     JOIN categories c ON d.category_id = c.id
            WHERE d.is_available = TRUE
            ORDER BY c.display_order, d.id;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Błąd połączenia z bazą w chmurze:', err.message);
        res.status(500).json({ error: 'Błąd serwera podczas pobierania menu' });
    }
});
// NOWY ENDPOINT: Przyjmowanie zamówień i zapis w bazie danych
app.post('/api/orders', async (req, res) => {
    const { items, totalPrice } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Koszyk nie może być pusty.' });
    }

    // Pobieramy połączenie z puli, by wykonać bezpieczną transakcję (ACID)
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Rozpoczęcie transakcji

        // 1. Wstawienie zamówienia głównego
        const orderQuery = `
            INSERT INTO orders (total_price) 
            VALUES ($1) 
            RETURNING id;
        `;
        const orderResult = await client.query(orderQuery, [totalPrice]);
        const orderId = orderResult.rows[0].id;

        // 2. Wstawienie wszystkich pozycji z koszyka powiązanych z tym zamówieniem
        const itemQuery = `
            INSERT INTO order_items (order_id, dish_id, quantity, special_notes, price) 
            VALUES ($1, $2, $3, $4, $5);
        `;

        for (const item of items) {
            await client.query(itemQuery, [
                orderId,
                item.dish_id,
                item.quantity,
                item.special_notes || null, // Zapewnia obsługę braku uwag
                item.price
            ]);
        }

        await client.query('COMMIT'); // Zatwierdzenie zmian w bazie danych
        
        res.status(201).json({ 
            success: true, 
            message: 'Zamówienie zostało pomyślnie zapisane!', 
            orderId: orderId 
        });

    } catch (err) {
        await client.query('ROLLBACK'); // W razie błędu wycofujemy wszystkie zmiany
        console.error('Błąd podczas zapisywania zamówienia:', err.message);
        res.status(500).json({ error: 'Wystąpił błąd serwera podczas składania zamówienia.' });
    } finally {
        client.release(); // Zwolnienie klienta z powrotem do puli
    }
});
app.listen(PORT, () => {
    console.log(`Serwer połączony z chmurą działa na porcie http://localhost:${PORT}`);
});