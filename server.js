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

app.listen(PORT, () => {
    console.log(`Serwer połączony z chmurą działa na porcie http://localhost:${PORT}`);
});