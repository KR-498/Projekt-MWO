import express from "express";
import pg from "pg";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "domyslny_sekretny_klucz_dev";
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

// Pobieranie godzin pracy kuchni dla konkretnej daty (podpowiedź w koszyku)
app.get("/api/kitchen-hours", async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: "Brak parametru date." });
  }

  try {
    const hours = await getOpeningHours(date);
    if (!hours) {
      return res.json({ isClosed: true });
    }

    const closeMinutes = timeToMinutes(hours.close) - 30;
    const lastOrderHour = `${String(Math.floor(closeMinutes / 60)).padStart(2, "0")}:${String(closeMinutes % 60).padStart(2, "0")}`;

    res.json({
      isClosed: false,
      open: hours.open,
      close: hours.close,
      lastOrder: lastOrderHour,
    });
  } catch (err) {
    console.error("Błąd pobierania godzin otwarcia:", err.message);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// Middleware: opcjonalne rozpoznanie zalogowanego użytkownika (nie blokuje gości)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ").at(1);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

// Middleware: wymaga zalogowania (historia zamówień i oceny posiłków)
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Wymagane zalogowanie." });
  }
  try {
    req.user = jwt.verify(authHeader.split(" ").at(1), JWT_SECRET);
    next();
  } catch {
    return res
      .status(401)
      .json({ error: "Sesja wygasła lub nieprawidłowy token." });
  }
}

// Middleware: wymaga roli administratora (konto admin@admin.com)
function requireAdmin(req, res, next) {
  if (
    !req.user ||
    req.user.role !== "admin" ||
    String(req.user.email || "").toLowerCase() !== "admin@admin.com"
  ) {
    return res.status(403).json({ error: "Brak uprawnień administratora." });
  }
  next();
}

const ISO_DAYS_META = [
  { iso: 1, label: "Poniedziałek", rangeEnd: "poniedziałek" },
  { iso: 2, label: "Wtorek", rangeEnd: "wtorek" },
  { iso: 3, label: "Środa", rangeEnd: "środa" },
  { iso: 4, label: "Czwartek", rangeEnd: "czwartek" },
  { iso: 5, label: "Piątek", rangeEnd: "piątek" },
  { iso: 6, label: "Sobota", rangeEnd: "sobota" },
  { iso: 7, label: "Niedziela", rangeEnd: "niedziela" },
];

// Aktualizacja godzin otwarcia w bazie danych (tylko admin@admin.com)
app.put("/api/opening-hours", requireAuth, requireAdmin, async (req, res) => {
  const { schedule } = req.body;
  if (!Array.isArray(schedule) || schedule.length !== 7) {
    return res.status(400).json({
      error: "Nieprawidłowy format harmonogramu tygodnia.",
    });
  }

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  const normalizedDays = [];

  for (const meta of ISO_DAYS_META) {
    const entry = schedule.find((d) => Number(d.isoDay) === meta.iso);
    if (!entry || !entry.isOpen) {
      normalizedDays.push({
        ...meta,
        isOpen: false,
        openTime: null,
        closeTime: null,
      });
      continue;
    }

    const openTime = String(entry.openTime || "").slice(0, 5);
    const closeTime = String(entry.closeTime || "").slice(0, 5);

    if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
      return res.status(400).json({
        error: `Podaj poprawne godziny w formacie HH:MM dla dnia: ${meta.label}.`,
      });
    }

    if (timeToMinutes(openTime) >= timeToMinutes(closeTime)) {
      return res.status(400).json({
        error: `Godzina zamknięcia musi być późniejsza niż otwarcia (${meta.label}).`,
      });
    }

    normalizedDays.push({ ...meta, isOpen: true, openTime, closeTime });
  }

  const groupedRows = [];
  for (const day of normalizedDays) {
    if (!day.isOpen) continue;
    const prev = groupedRows.at(-1);
    if (
      prev &&
      prev.endIso === day.iso - 1 &&
      prev.openTime === day.openTime &&
      prev.closeTime === day.closeTime
    ) {
      prev.endIso = day.iso;
      prev.endLabel = day.rangeEnd;
    } else {
      groupedRows.push({
        startIso: day.iso,
        endIso: day.iso,
        startLabel: day.label,
        endLabel: day.rangeEnd,
        openTime: day.openTime,
        closeTime: day.closeTime,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM opening_hours");

    const insertedRows = [];
    for (let i = 0; i < groupedRows.length; i++) {
      const g = groupedRows[i];
      const daysLabel =
        g.startIso === g.endIso ? g.startLabel : `${g.startLabel}–${g.endLabel}`;
      const insertRes = await client.query(
        `INSERT INTO opening_hours (days_label, open_time, close_time, display_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id, days_label, open_time, close_time, display_order`,
        [daysLabel, g.openTime, g.closeTime, i + 1],
      );
      insertedRows.push(insertRes.rows[0]);
    }

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Godziny otwarcia zostały zaktualizowane w bazie danych.",
      rows: insertedRows,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Błąd aktualizacji godzin otwarcia:", err.message);
    res.status(500).json({
      error: "Błąd serwera podczas zapisywania godzin otwarcia.",
    });
  } finally {
    client.release();
  }
});

// REJESTRACJA NOWEGO UŻYTKOWNIKA
app.post("/api/auth/register", async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({
      error: "Podaj imię, poprawny e-mail oraz hasło (minimum 6 znaków).",
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      normalizedEmail,
    ]);
    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "Konto z tym adresem e-mail już istnieje." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, name, email, phone, role, default_street, default_city`,
      [name.trim(), normalizedEmail, phone ? phone.trim() : null, passwordHash],
    );

    const user = result.rows.at(0);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Błąd rejestracji:", err.message);
    res.status(500).json({ error: "Błąd serwera podczas rejestracji." });
  }
});

// LOGOWANIE UŻYTKOWNIKA
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Podaj adres e-mail oraz hasło." });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      normalizedEmail,
    ]);
    const userRow = result.rows.at(0);

    if (!userRow) {
      return res.status(401).json({ error: "Nieprawidłowy e-mail lub hasło." });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      userRow.password_hash,
    );
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Nieprawidłowy e-mail lub hasło." });
    }

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      phone: userRow.phone,
      role: userRow.role,
      default_street: userRow.default_street,
      default_city: userRow.default_city,
    };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.json({ token, user });
  } catch (err) {
    console.error("Błąd logowania:", err.message);
    res.status(500).json({ error: "Błąd serwera podczas logowania." });
  }
});

// POBIERANIE AKTUALNYCH DANYCH ZALOGOWANEGO UŻYTKOWNIKA
app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, role, default_street, default_city FROM users WHERE id = $1",
      [req.user.id],
    );
    const user = result.rows.at(0);
    if (!user)
      return res.status(404).json({ error: "Użytkownik nie istnieje." });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Błąd serwera." });
  }
});

// ==========================================
// OCENY I OPINIE POSIŁKÓW (dish_reviews)
// ==========================================

// Pobieranie ocen oraz średniej dla konkretnego dania
app.get("/api/dishes/:dishId/reviews", async (req, res) => {
  const dishId = Number(req.params.dishId);
  if (!Number.isInteger(dishId) || dishId <= 0) {
    return res.status(400).json({ error: "Nieprawidłowe ID dania." });
  }

  try {
    const reviewsResult = await pool.query(
      `SELECT id, dish_id, dish_name, user_id, user_name, user_email, rating, comment, created_at
       FROM dish_reviews
       WHERE dish_id = $1
       ORDER BY created_at DESC;`,
      [dishId],
    );

    const statsResult = await pool.query(
      `SELECT
         COUNT(*)::int AS reviews_count,
         COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS average_rating
       FROM dish_reviews
       WHERE dish_id = $1;`,
      [dishId],
    );

    res.json({
      dishId,
      averageRating: statsResult.rows[0].average_rating,
      reviewsCount: statsResult.rows[0].reviews_count,
      reviews: reviewsResult.rows,
    });
  } catch (err) {
    console.error("Błąd pobierania ocen dania:", err.message);
    res.status(500).json({ error: "Błąd serwera podczas pobierania ocen." });
  }
});

// Pobieranie wszystkich ostatnich opinii
app.get("/api/reviews", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, dish_id, dish_name, user_id, user_name, user_email, rating, comment, created_at
       FROM dish_reviews
       ORDER BY created_at DESC;`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Błąd pobierania wszystkich ocen:", err.message);
    res.status(500).json({ error: "Błąd serwera podczas pobierania opinii." });
  }
});

// Dodawanie oceny do konkretnego dania (tylko dla zalogowanego użytkownika, max 1 ocena na danie)
app.post("/api/dishes/:dishId/reviews", requireAuth, async (req, res) => {
  const dishId = Number(req.params.dishId);
  const rating = Number(req.body.rating);
  const comment = req.body.comment ? String(req.body.comment).trim() : null;

  if (!Number.isInteger(dishId) || dishId <= 0) {
    return res.status(400).json({ error: "Nieprawidłowe ID dania." });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ error: "Ocena musi być liczbą całkowitą od 1 do 5." });
  }

  try {
    const dishResult = await pool.query(
      "SELECT id, name FROM dishes WHERE id = $1",
      [dishId],
    );
    const dish = dishResult.rows.at(0);
    if (!dish) {
      return res.status(404).json({ error: "Wybrane danie nie istnieje." });
    }

    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [req.user.id],
    );
    const user = userResult.rows.at(0);
    if (!user) {
      return res.status(404).json({ error: "Nie znaleziono konta użytkownika." });
    }

    // Sprawdzenie, czy użytkownik już ocenił to konkretne danie
    const existingReview = await pool.query(
      "SELECT id FROM dish_reviews WHERE dish_id = $1 AND user_id = $2 LIMIT 1",
      [dish.id, user.id],
    );
    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        error: "Możesz wystawić tylko jedną ocenę dla tego dania.",
      });
    }

    const insertResult = await pool.query(
      `INSERT INTO dish_reviews (dish_id, dish_name, user_id, user_name, user_email, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, dish_id, dish_name, user_id, user_name, user_email, rating, comment, created_at;`,
      [dish.id, dish.name, user.id, user.name, user.email, rating, comment || null],
    );

    res.status(201).json({
      success: true,
      message: "Dziękujemy za wystawienie oceny!",
      review: insertResult.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "Możesz wystawić tylko jedną ocenę dla tego dania.",
      });
    }
    console.error("Błąd podczas zapisywania oceny:", err.message);
    res
      .status(500)
      .json({ error: "Błąd serwera podczas zapisywania oceny dania." });
  }
});

// Usuwanie oceny przez administratora (moderacja)
app.delete("/api/reviews/:id", requireAuth, requireAdmin, async (req, res) => {
  const reviewId = Number(req.params.id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return res.status(400).json({ error: "Nieprawidłowe ID opinii." });
  }

  try {
    const deleteResult = await pool.query(
      "DELETE FROM dish_reviews WHERE id = $1 RETURNING id",
      [reviewId],
    );
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono takiej opinii." });
    }
    res.json({ success: true, message: "Opinia została usunięta." });
  } catch (err) {
    console.error("Błąd usuwania opinii:", err.message);
    res.status(500).json({ error: "Błąd serwera podczas usuwania opinii." });
  }
});

// Przyjmowanie zamówień i zapis w bazie danych (z planowaniem dostawy i walidacją godzin)
app.post("/api/orders", optionalAuth, async (req, res) => {
  console.log("--- NOWE ZAMÓWIENIE Z FRONTU ---");
  console.log("ODEBRANE BODY:", JSON.stringify(req.body, null, 2));
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
    scheduledTime,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Koszyk nie może być pusty." });
  }
  if (!customerName || !customerPhone || !scheduledDate || !scheduledTime) {
    return res
      .status(400)
      .json({ error: "Uzupełnij imię, telefon, datę oraz godzinę." });
  }
  if (
    deliveryType === "delivery" &&
    (!deliveryStreet?.trim() || !deliveryCity?.trim())
  ) {
    return res
      .status(400)
      .json({ error: "Podaj pełny adres dostawy (ulica i miasto)." });
  }

  if (isDateTimeInPast(scheduledDate, scheduledTime)) {
    return res.status(400).json({ error: "Wybrany termin już minął." });
  }

  const [year, month, day] = String(scheduledDate).split("-").map(Number);
  const [hours, minutes] = String(scheduledTime).split(":").map(Number);
  const targetDateTime = new Date(year, month - 1, day, hours, minutes, 0);
  const minPreparationTime = new Date(Date.now() + 45 * 60 * 1000);

  if (targetDateTime < minPreparationTime) {
    return res.status(400).json({
      error:
        "Potrzebujemy minimum 45 minut na przygotowanie zamówienia. Wybierz późniejszą godzinę.",
    });
  }

  try {
    const openingHours = await getOpeningHours(scheduledDate);

    if (!openingHours) {
      return res.status(400).json({
        error:
          "W wybranym dniu restauracja jest zamknięta. Wybierz inny termin.",
      });
    }

    const requestedMinutes = timeToMinutes(scheduledTime);
    const openMinutes = timeToMinutes(openingHours.open);
    const closeMinutes = timeToMinutes(openingHours.close) - 30;

    if (requestedMinutes < openMinutes || requestedMinutes > closeMinutes) {
      const lastOrderHour = `${String(Math.floor(closeMinutes / 60)).padStart(2, "0")}:${String(closeMinutes % 60).padStart(2, "0")}`;
      return res.status(400).json({
        error: `W wybranym dniu zamówienia realizujemy w godzinach ${openingHours.open}–${lastOrderHour}.`,
      });
    }

    const parseSafeNumber = (val) => {
      if (typeof val === "number" && !Number.isNaN(val)) return val;
      if (typeof val === "string") {
        const cleaned = val.replace(",", ".").replace(/[^\d.-]/g, "");
        const parsed = parseFloat(cleaned);
        return Number.isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const itemsSubtotal = items.reduce((sum, item) => {
      const unitPrice = parseSafeNumber(
        item.price ??
          item.unit_price ??
          item.total_price / (item.quantity || 1),
      );
      const qty = parseSafeNumber(item.quantity) || 1;
      return sum + unitPrice * qty;
    }, 0);

    const deliveryFee =
      deliveryType === "delivery" && itemsSubtotal < 150 ? 15.0 : 0.0;
    const finalTotalPrice = Number((itemsSubtotal + deliveryFee).toFixed(2));

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const orderQuery = `
        INSERT INTO orders (
          total_price, delivery_fee, customer_name, customer_email, customer_phone,
          delivery_type, delivery_street, delivery_city, delivery_notes,
          scheduled_date, scheduled_time, user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id;
      `;

      const orderValues = [
        finalTotalPrice,
        deliveryFee,
        customerName.trim(),
        customerEmail ? customerEmail.trim() : null,
        customerPhone.trim(),
        deliveryType,
        deliveryType === "delivery" ? deliveryStreet.trim() : null,
        deliveryType === "delivery" ? deliveryCity.trim() : null,
        deliveryType === "delivery" && deliveryNotes
          ? deliveryNotes.trim()
          : null,
        scheduledDate,
        scheduledTime,
        req.user ? req.user.id : null,
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
          item.special_notes || item.notes || null,
        ]);
      }

      await client.query("COMMIT");
      if (customerEmail && customerEmail.trim()) {
        try {
          await sendOrderEmail({
            orderId,
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            customerPhone: customerPhone.trim(),
            deliveryType,
            deliveryStreet: deliveryStreet ? deliveryStreet.trim() : null,
            deliveryCity: deliveryCity ? deliveryCity.trim() : null,
            deliveryNotes: deliveryNotes ? deliveryNotes.trim() : null,
            deliveryFee,
            scheduledDate,
            scheduledTime,
            items,
            finalTotalPrice,
          });
          console.log(
            `Potwierdzenie zamówienia wysłane na: ${customerEmail.trim()}`,
          );
        } catch (emailErr) {
          console.error(
            "Błąd podczas wysyłania e-maila z zamówieniem:",
            emailErr.message,
          );
        }
      }
      res.status(201).json({
        success: true,
        message: "Zamówienie zostało pomyślnie zapisane!",
        orderId: orderId,
        finalTotal: finalTotalPrice,
      });
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Błąd podczas zapisywania zamówienia:", err.message);
    res
      .status(500)
      .json({ error: "Wystąpił błąd serwera podczas składania zamówienia." });
  }
});

function timeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr).split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

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

async function getOpeningHours(dateStr) {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const jsDay = new Date(year, month - 1, day).getDay();
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

async function sendOrderEmail({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  deliveryType,
  deliveryStreet,
  deliveryCity,
  deliveryNotes,
  deliveryFee,
  scheduledDate,
  scheduledTime,
  items,
  finalTotalPrice,
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
    host: ["smtp-relay", "brevo.com"].join("."),
    port: 587,
    secure: false,
    auth: {
      user: config.email_user,
      pass: config.email_pass,
    },
  });

  const itemsListHtml = items
    .map(
      (item) =>
        `<li><strong>${item.dish_name || item.name}</strong> × ${item.quantity} — ${(
          Number(item.price) * Number(item.quantity)
        ).toFixed(2)} zł${
          item.special_notes || item.notes
            ? ` <em>(${item.special_notes || item.notes})</em>`
            : ""
        }</li>`,
    )
    .join("");

  const deliveryDetailsHtml =
    deliveryType === "delivery"
      ? `<li><strong>Sposób realizacji:</strong> Dostawa (${deliveryStreet}, ${deliveryCity})</li>
         ${deliveryNotes ? `<li><strong>Uwagi dla kuriera:</strong> ${deliveryNotes}</li>` : ""}
         <li><strong>Koszt dostawy:</strong> ${deliveryFee === 0 ? "Gratis" : `${deliveryFee.toFixed(2)} zł`}</li>`
      : `<li><strong>Sposób realizacji:</strong> Odbiór osobisty w restauracji</li>`;

  await transporter.sendMail({
    from: `"Restauracja" <${config.email_from || config.email_user}>`,
    to: customerEmail,
    subject: `Potwierdzenie zamówienia nr #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #24201c; line-height: 1.6;">
        <h2>Dziękujemy za zamówienie w naszej restauracji</h2>
        <p>Cześć <strong>${customerName}</strong>, Twoje zamówienie <strong>#${orderId}</strong> zostało przyjęte do realizacji.</p>
        <ul>
          <li><strong>Zaplanowany termin:</strong> ${scheduledDate} o godz. ${scheduledTime}</li>
          <li><strong>Telefon kontaktowy:</strong> ${customerPhone}</li>
          ${deliveryDetailsHtml}
        </ul>
        <h3>Zamówione potrawy:</h3>
        <ul>
          ${itemsListHtml}
        </ul>
        <p style="font-size: 1.1rem;"><strong>Łącznie do zapłaty: ${finalTotalPrice.toFixed(2)} zł</strong></p>
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
  const MIN_DIFF_MINUTES = 180;

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

    const existingResult = await pool.query(
      `SELECT table_number, reservation_time
       FROM reservations
       WHERE reservation_date = $1
         AND table_number IS NOT NULL`,
      [reservationDate],
    );

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
        unusedTables.push(tableNum);
      } else {
        const hasConflict = bookedTimes.some(
          (bookedMinutes) =>
            Math.abs(bookedMinutes - requestedMinutes) < MIN_DIFF_MINUTES,
        );
        if (!hasConflict) {
          reusableTables.push(tableNum);
        }
      }
    }

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