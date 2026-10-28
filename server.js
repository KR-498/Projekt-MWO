import express from 'express';
import pg from 'pg';
import cors from 'cors';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Połączenie z PostgreSQL
const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'Ernest-2005',
    port: 5432,
});

// Endpoint zwracający menu z kategoriami
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
        console.error('Błąd bazy danych:', err.message);
        res.status(500).json({ error: 'Błąd serwera podczas pobierania menu' });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer backendowy działa na: http://localhost:${PORT}`);
});