import express from "express";
import pg from "pg";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Połączenie z bazą danych na Neon.tech
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.get("/api/dishes", async (req, res) => {
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
    console.error("Błąd połączenia z bazą w chmurze:", err.message);
    res.status(500).json({ error: "Błąd serwera podczas pobierania menu" });
  }
});

// Pobieranie godzin otwarcia z bazy danych
app.get("/api/opening-hours", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, days_label, open_time, close_time, display_order
      FROM opening_hours
      ORDER BY display_order, id;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Błąd podczas pobierania godzin otwarcia:", err.message);
    res
      .status(500)
      .json({ error: "Błąd serwera podczas pobierania godzin otwarcia" });
  }
});

// Przyjmowanie zamówień i zapis w bazie danych
// Przyjmowanie zamówień i zapis w bazie danych (z planowaniem dostawy i walidacją godzin)
// Przyjmowanie zamówień i zapis w bazie danych
app.post('/api/orders', async (req, res) => {
    console.log('--- NOWE ZAMÓWIENIE Z FRONTU ---');
    console.log('ODEBRANE BODY:', JSON.stringify(req.body, null, 2));
    const {
        items,
        customerName,
        customerEmail,
        customerPhone,
        deliveryType,
        deliveryStreet,
        deliveryCity,
        deliveryNotes,
        scheduledDate,
        scheduledTime
    } = req.body;

    // 1. Walidacja koszyka i podstawowych danych
    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Koszyk nie może być pusty.' });
    }
    if (!customerName || !customerPhone || !scheduledDate || !scheduledTime) {
        return res.status(400).json({ error: 'Uzupełnij imię, telefon, datę oraz godzinę.' });
    }
    if (deliveryType === 'delivery' && (!deliveryStreet?.trim() || !deliveryCity?.trim())) {
        return res.status(400).json({ error: 'Podaj pełny adres dostawy (ulica i miasto).' });
    }

    // 2. Walidacja przeszłości oraz 45-minutowego bufora na przygotowanie
    if (isDateTimeInPast(scheduledDate, scheduledTime)) {
        return res.status(400).json({ error: 'Wybrany termin już minął.' });
    }

    const [year, month, day] = String(scheduledDate).split('-').map(Number);
    const [hours, minutes] = String(scheduledTime).split(':').map(Number);
    const targetDateTime = new Date(year, month - 1, day, hours, minutes, 0);
    const minPreparationTime = new Date(Date.now() + 45 * 60 * 1000);

    if (targetDateTime < minPreparationTime) {
        return res.status(400).json({
            error: 'Potrzebujemy minimum 45 minut na przygotowanie zamówienia. Wybierz późniejszą godzinę.'
        });
    }

    try {
        // 3. Walidacja godzin otwarcia (zgodnie z getOpeningHours w server.js: zwraca { open, close } lub null)
        const openingHours = await getOpeningHours(scheduledDate);

        if (!openingHours) {
            return res.status(400).json({
                error: 'W wybranym dniu restauracja jest zamknięta. Wybierz inny termin.'
            });
        }

        const requestedMinutes = timeToMinutes(scheduledTime);
        const openMinutes = timeToMinutes(openingHours.open);
        const closeMinutes = timeToMinutes(openingHours.close) - 30; // Kuchnia zamyka się 30 min przed końcem

        if (requestedMinutes < openMinutes || requestedMinutes > closeMinutes) {
            const lastOrderHour = `${String(Math.floor(closeMinutes / 60)).padStart(2, '0')}:${String(closeMinutes % 60).padStart(2, '0')}`;
            return res.status(400).json({
                error: `W wybranym dniu zamówienia realizujemy w godzinach ${openingHours.open}–${lastOrderHour}.`
            });
        }

        // 4. Bezpieczne przeliczenie kwoty i kosztu dostawy na backendzie
        const parseSafeNumber = (val) => {
            if (typeof val === 'number' && !Number.isNaN(val)) return val;
            if (typeof val === 'string') {
                const cleaned = val.replace(',', '.').replace(/[^\d.-]/g, '');
                const parsed = parseFloat(cleaned);
                return Number.isNaN(parsed) ? 0 : parsed;
            }
            return 0;
        };

        const itemsSubtotal = items.reduce((sum, item) => {
            const unitPrice = parseSafeNumber(item.price ?? item.unit_price ?? (item.total_price / (item.quantity || 1)));
            const qty = parseSafeNumber(item.quantity) || 1;
            return sum + (unitPrice * qty);
        }, 0);

        const deliveryFee = (deliveryType === 'delivery' && itemsSubtotal < 150) ? 15.00 : 0.00;
        const finalTotalPrice = Number((itemsSubtotal + deliveryFee).toFixed(2));

        // 5. Zapis w transakcji SQL
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const orderQuery = `
                INSERT INTO orders (
                    total_price, delivery_fee, customer_name, customer_email, customer_phone,
                    delivery_type, delivery_street, delivery_city, delivery_notes,
                    scheduled_date, scheduled_time
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id;
            `;

            const orderValues = [
                finalTotalPrice,
                deliveryFee,
                customerName.trim(),
                customerEmail ? customerEmail.trim() : null,
                customerPhone.trim(),
                deliveryType,
                deliveryType === 'delivery' ? deliveryStreet.trim() : null,
                deliveryType === 'delivery' ? deliveryCity.trim() : null,
                deliveryType === 'delivery' && deliveryNotes ? deliveryNotes.trim() : null,
                scheduledDate,
                scheduledTime
            ];

            const orderResult = await client.query(orderQuery, orderValues);
            const orderId = orderResult.rows[0].id;

            const itemQuery = `
                INSERT INTO order_items (order_id, dish_id, dish_name, quantity, price, special_notes)
                VALUES ($1, $2, $3, $4, $5, $6);
            `;

            for (const item of items) {
                await client.query(itemQuery, [
                    orderId,
                    item.dish_id || item.id,
                    item.dish_name || item.name,
                    item.quantity,
                    parseSafeNumber(item.price),
                    item.special_notes || item.notes || null
                ]);
            }

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Zamówienie zostało pomyślnie zapisane!',
                orderId: orderId,
                finalTotal: finalTotalPrice
            });

        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Błąd podczas zapisywania zamówienia:', err.message);
        res.status(500).json({ error: 'Wystąpił błąd serwera podczas składania zamówienia.' });
    }
});



// Pomocnicza funkcja zamieniająca godzinę "HH:MM" lub "HH:MM:SS" na minuty od północy
function timeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr).split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

// Sprawdza, czy podana data i godzina należą do przeszłości
function isDateTimeInPast(dateStr, timeStr) {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const [hours, minutes] = String(timeStr || "00:00")
    .split(":")
    .map(Number);
  const target = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
  return target < new Date();
}

function parseIsoDayName(str) {
  const s = String(str || "")
    .trim()
    .toLowerCase();
  if (s.startsWith("pon")) return 1;
  if (s.startsWith("wt")) return 2;
  if (s.startsWith("śr") || s.startsWith("sr")) return 3;
  if (s.startsWith("czw")) return 4;
  if (s.startsWith("pi") || s.startsWith("pt")) return 5;
  if (s.startsWith("sob") || s.startsWith("sb")) return 6;
  if (s.startsWith("nie") || s.startsWith("nd")) return 7;
  return null;
}

function doesLabelMatchDay(daysLabel, isoDay) {
  const parts = String(daysLabel || "").split(/\s*(?:[-–—]|\bdo\b)\s*/i);
  if (parts.length >= 2) {
    const start = parseIsoDayName(parts[0]);
    const end = parseIsoDayName(parts[1]);
    if (start !== null && end !== null) {
      return start <= end
        ? isoDay >= start && isoDay <= end
        : isoDay >= start || isoDay <= end;
    }
  }
  const single = parseIsoDayName(parts[0]);
  return single !== null && isoDay === single;
}

// Pobiera godziny otwarcia z bazy danych dla podanej daty ("YYYY-MM-DD") lub zwraca null, jeśli lokal jest zamknięty
async function getOpeningHours(dateStr) {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const jsDay = new Date(year, month - 1, day).getDay(); // 0 = Niedziela, 1 = Poniedziałek, ..., 6 = Sobota
  const isoDay = jsDay === 0 ? 7 : jsDay;

  const result = await pool.query(
    "SELECT days_label, open_time, close_time FROM opening_hours ORDER BY display_order, id",
  );

  for (const row of result.rows) {
    if (doesLabelMatchDay(row.days_label, isoDay)) {
      if (!row.open_time || !row.close_time) {
        return null;
      }
      return {
        open: String(row.open_time).slice(0, 5),
        close: String(row.close_time).slice(0, 5),
      };
    }
  }
  return null;
}

// Wysyła e-mail z potwierdzeniem rezerwacji na adres podany przez gościa
async function sendReservationEmail({
  name,
  email,
  reservationDate,
  reservationTime,
  guestsCount,
  assignedTable,
}) {
  const configResult = await pool.query(
    "SELECT email_user, email_pass, email_from FROM email_config LIMIT 1",
  );
  const config = configResult.rows[0];

  if (!config || !config.email_user || !config.email_pass) {
    console.warn(
      "Brak konfiguracji e-mail w tabeli email_config – pominięto wysyłkę maila",
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: config.email_user,
      pass: config.email_pass,
    },
  });

  await transporter.sendMail({
    from: `"Restauracja" <${config.email_from || config.email_user}>`,
    to: email,
    subject: "Potwierdzenie rezerwacji",
    html: `
            <div style="font-family: Arial, sans-serif; color: #24201c; line-height: 1.6;">
                <h2>Dziękujemy za rezerwację w naszej restauracji</h2>
                <p>Cześć <strong>${name}</strong>, Twoja rezerwacja została potwierdzona.</p>
                <ul>
                    <li><strong>Data:</strong> ${reservationDate}</li>
                    <li><strong>Godzina:</strong> ${reservationTime}</li>
                    <li><strong>Liczba osób:</strong> ${guestsCount}</li>
                    <li><strong>Numer stolika:</strong> ${assignedTable}</li>
                </ul>
                <p>Do zobaczenia!</p>
            </div>
        `,
  });
}

// Przyjmowanie rezerwacji stolików i zapis w bazie danych (z losowaniem stolika 1-50 i min. 3h odstępu)
app.post("/api/reservations", async (req, res) => {
  const {
    name,
    email,
    phone,
    date,
    time,
    reservation_date,
    reservation_time,
    guests,
  } = req.body;

  const reservationDate = reservation_date || date;
  const reservationTime = reservation_time || time;
  const guestsCount = Number(guests);

  if (
    !name ||
    !email ||
    !phone ||
    !reservationDate ||
    !reservationTime ||
    !guestsCount
  ) {
    return res
      .status(400)
      .json({ error: "Wszystkie pola rezerwacji są wymagane." });
  }

  if (isDateTimeInPast(reservationDate, reservationTime)) {
    return res.status(400).json({
      error: "Nie można dokonać rezerwacji na termin z przeszłości.",
    });
  }

  const TOTAL_TABLES = 50;
  const MIN_DIFF_MINUTES = 180; // 3 godziny = 180 minut

  try {
    const openingHours = await getOpeningHours(reservationDate);
    if (!openingHours) {
      return res.status(400).json({
        error: "W wybranym dniu restauracja jest zamknięta.",
      });
    }

    const requestedMinutes = timeToMinutes(reservationTime);
    const openMinutes = timeToMinutes(openingHours.open);
    const closeMinutes = timeToMinutes(openingHours.close);

    if (requestedMinutes < openMinutes || requestedMinutes > closeMinutes) {
      return res.status(400).json({
        error: `W wybranym dniu restauracja czynna jest w godzinach ${openingHours.open}–${openingHours.close}.`,
      });
    }

    // 1. Pobieramy istniejące rezerwacje w wybranym dniu
    const existingResult = await pool.query(
      `SELECT table_number, reservation_time
             FROM reservations
             WHERE reservation_date = $1
               AND table_number IS NOT NULL`,
      [reservationDate],
    );

    // Grupujemy godziny rezerwacji według numeru stolika
    const reservationsByTable = new Map();
    for (const row of existingResult.rows) {
      const tableNum = Number(row.table_number);
      if (!reservationsByTable.has(tableNum)) {
        reservationsByTable.set(tableNum, []);
      }
      reservationsByTable
        .get(tableNum)
        .push(timeToMinutes(row.reservation_time));
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
          (bookedMinutes) =>
            Math.abs(bookedMinutes - requestedMinutes) < MIN_DIFF_MINUTES,
        );
        if (!hasConflict) {
          reusableTables.push(tableNum);
        }
      }
    }

    // Najpierw losujemy spośród całkiem wolnych stolików, a gdy ich braknie – spośród stolików z min. 3h odstępu
    const candidateTables =
      unusedTables.length > 0 ? unusedTables : reusableTables;

    if (candidateTables.length === 0) {
      return res.status(409).json({
        error:
          "Brak wolnych stolików na wybraną godzinę (wymagany odstęp min. 3 godz.). Prosimy wybrać inną godzinę.",
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
      assignedTable,
    ];
    const result = await pool.query(insertQuery, values);

    try {
      await sendReservationEmail({
        name,
        email,
        reservationDate,
        reservationTime,
        guestsCount,
        assignedTable,
      });
    } catch (emailErr) {
      console.error(
        "Błąd podczas wysyłania e-maila z potwierdzeniem:",
        emailErr.message,
      );
    }

    res.status(201).json({
      success: true,
      message: `Rezerwacja została pomyślnie zapisana! Przypisano stolik nr ${assignedTable}.`,
      reservation: result.rows[0],
    });
  } catch (err) {
    console.error("Błąd podczas zapisywania rezerwacji:", err.message);
    res
      .status(500)
      .json({ error: "Wystąpił błąd serwera podczas zapisywania rezerwacji." });
  }
});

app.listen(PORT, () => {
  console.log(
    `Serwer połączony z chmurą działa na porcie http://localhost:${PORT}`,
  );
});
