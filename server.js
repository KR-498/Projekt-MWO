import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Połączenie z bazą danych na Neon.tech
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

// Przyjmowanie zamówień i zapis w bazie danych
app.post('/api/orders', async (req, res) => {
    const { items, totalPrice } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Koszyk nie może być pusty.' });
    }

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

        // 2. Wstawienie pozycji z koszyka (kolejność kolumn ułożona pod tablicę poniżej)
        const itemQuery = `
            INSERT INTO order_items (order_id, dish_id, dish_name, quantity, price, special_notes)
            VALUES ($1, $2, $3, $4, $5, $6);
        `;

        for (const item of items) {
            await client.query(itemQuery, [
                orderId,                                    // $1 -> order_id (INT)
                item.dish_id || item.id,                    // $2 -> dish_id (INT)
                item.dish_name || item.name,                // $3 -> dish_name (TEXT)
                item.quantity,                              // $4 -> quantity (INT)
                item.price,                                 // $5 -> price (NUMERIC)
                item.special_notes || item.notes || null    // $6 -> special_notes (TEXT)
            ]);
        }

        await client.query('COMMIT'); // Zatwierdzenie zmian

        res.status(201).json({
            success: true,
            message: 'Zamówienie zostało pomyślnie zapisane!',
            orderId: orderId
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Wycofanie zmian przy błędzie
        console.error('Błąd podczas zapisywania zamówienia:', err.message);
        res.status(500).json({ error: 'Wystąpił błąd serwera podczas składania zamówienia.' });
    } finally {
        client.release();
    }
});

// Pomocnicza funkcja zamieniająca godzinę "HH:MM" lub "HH:MM:SS" na minuty od północy
function timeToMinutes(timeStr) {
    const [hours, minutes] = String(timeStr).split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
}

// Sprawdza, czy podana data i godzina należą do przeszłości
function isDateTimeInPast(dateStr, timeStr) {
    const [year, month, day] = String(dateStr).split('-').map(Number);
    const [hours, minutes] = String(timeStr || '00:00').split(':').map(Number);
    const target = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
    return target < new Date();
}

// Zwraca godziny otwarcia dla podanej daty ("YYYY-MM-DD") lub null, jeśli w tym dniu restauracja jest zamknięta
function getOpeningHours(dateStr) {
    const [year, month, day] = String(dateStr).split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0 = Niedziela, 1 = Poniedziałek, ..., 6 = Sobota

    if (dayOfWeek === 1) {
        return null; // Poniedziałek: Zamknięte
    }
    if (dayOfWeek >= 2 && dayOfWeek <= 4) {
        return { open: '17:00', close: '22:30' }; // Wtorek — Czwartek
    }
    if (dayOfWeek === 5 || dayOfWeek === 6) {
        return { open: '17:00', close: '23:30' }; // Piątek — Sobota
    }
    return { open: '16:00', close: '21:30' }; // Niedziela
}

// Przyjmowanie rezerwacji stolików i zapis w bazie danych (z losowaniem stolika 1-50 i min. 3h odstępu)
app.post('/api/reservations', async (req, res) => {
    const { name, email, phone, date, time, reservation_date, reservation_time, guests } = req.body;

    const reservationDate = reservation_date || date;
    const reservationTime = reservation_time || time;
    const guestsCount = Number(guests);

    if (!name || !email || !phone || !reservationDate || !reservationTime || !guestsCount) {
        return res.status(400).json({ error: 'Wszystkie pola rezerwacji są wymagane.' });
    }

    if (isDateTimeInPast(reservationDate, reservationTime)) {
        return res.status(400).json({
            error: 'Nie można dokonać rezerwacji na termin z przeszłości.'
        });
    }

    const openingHours = getOpeningHours(reservationDate);
    if (!openingHours) {
        return res.status(400).json({
            error: 'W poniedziałki restauracja jest zamknięta. Zapraszamy od wtorku do niedzieli.'
        });
    }

    const requestedMinutes = timeToMinutes(reservationTime);
    const openMinutes = timeToMinutes(openingHours.open);
    const closeMinutes = timeToMinutes(openingHours.close);

    if (requestedMinutes < openMinutes || requestedMinutes > closeMinutes) {
        return res.status(400).json({
            error: `W wybranym dniu restauracja czynna jest w godzinach ${openingHours.open}–${openingHours.close}.`
        });
    }

    const TOTAL_TABLES = 50;
    const MIN_DIFF_MINUTES = 180; // 3 godziny = 180 minut

    try {
        // 1. Pobieramy istniejące rezerwacje w wybranym dniu
        const existingResult = await pool.query(
            `SELECT table_number, reservation_time
             FROM reservations
             WHERE reservation_date = $1
               AND table_number IS NOT NULL`,
            [reservationDate]
        );

        // Grupujemy godziny rezerwacji według numeru stolika
        const reservationsByTable = new Map();
        for (const row of existingResult.rows) {
            const tableNum = Number(row.table_number);
            if (!reservationsByTable.has(tableNum)) {
                reservationsByTable.set(tableNum, []);
            }
            reservationsByTable.get(tableNum).push(timeToMinutes(row.reservation_time));
        }

        const unusedTables = [];
        const reusableTables = [];

        for (let tableNum = 1; tableNum <= TOTAL_TABLES; tableNum++) {
            const bookedTimes = reservationsByTable.get(tableNum);

            if (!bookedTimes || bookedTimes.length === 0) {
                // Stolik nie ma jeszcze żadnej rezerwacji w tym dniu
                unusedTables.push(tableNum);
            } else {
                // Stolik ma już rezerwację w tym dniu – sprawdzamy, czy od każdej z nich mija min. 3h
                const hasConflict = bookedTimes.some(
                    (bookedMinutes) => Math.abs(bookedMinutes - requestedMinutes) < MIN_DIFF_MINUTES
                );
                if (!hasConflict) {
                    reusableTables.push(tableNum);
                }
            }
        }

        // Najpierw losujemy spośród całkiem wolnych stolików, a gdy ich braknie – spośród stolików z min. 3h odstępu
        const candidateTables = unusedTables.length > 0 ? unusedTables : reusableTables;

        if (candidateTables.length === 0) {
            return res.status(409).json({
                error: 'Brak wolnych stolików na wybraną godzinę (wymagany odstęp min. 3 godz.). Prosimy wybrać inną godzinę.'
            });
        }

        const randomIndex = Math.floor(Math.random() * candidateTables.length);
        const assignedTable = candidateTables[randomIndex];

        // 2. Zapisujemy rezerwację wraz z wylosowanym numerem stolika
        const insertQuery = `
            INSERT INTO reservations (name, email, phone, reservation_date, reservation_time, guests, table_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [
            name,
            email,
            phone,
            reservationDate,
            reservationTime,
            guestsCount,
            assignedTable
        ];
        const result = await pool.query(insertQuery, values);

        res.status(201).json({
            success: true,
            message: `Rezerwacja została pomyślnie zapisana! Przypisano stolik nr ${assignedTable}.`,
            reservation: result.rows[0]
        });
    } catch (err) {
        console.error('Błąd podczas zapisywania rezerwacji:', err.message);
        res.status(500).json({ error: 'Wystąpił błąd serwera podczas zapisywania rezerwacji.' });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer połączony z chmurą działa na porcie http://localhost:${PORT}`);
});
