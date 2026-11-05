import { useState } from "react";

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateTimeInPast(dateStr, timeStr) {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const [hours, minutes] = String(timeStr || "00:00").split(":").map(Number);
  const target = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
  return target < new Date();
}

function getOpeningHoursForDate(dateStr) {
  if (!dateStr) {
    return { open: "16:00", close: "23:30", closed: false };
  }
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0 = Niedziela, 1 = Poniedziałek, ..., 6 = Sobota

  if (dayOfWeek === 1) {
    return { open: null, close: null, closed: true }; // Poniedziałek: Zamknięte
  }
  if (dayOfWeek >= 2 && dayOfWeek <= 4) {
    return { open: "17:00", close: "22:30", closed: false }; // Wtorek — Czwartek
  }
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    return { open: "17:00", close: "23:30", closed: false }; // Piątek — Sobota
  }
  return { open: "16:00", close: "21:30", closed: false }; // Niedziela
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr).split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export default function Reservation() {
  const [selectedDate, setSelectedDate] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+48");
  const [customPrefix, setCustomPrefix] = useState("+");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [assignedTable, setAssignedTable] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const todayStr = getTodayDateString();
  const openingHours = getOpeningHoursForDate(selectedDate);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);

    if (newDate && newDate < getTodayDateString()) {
      setError("Nie można zarezerwować stolika na datę z przeszłości.");
      return;
    }

    const hours = getOpeningHoursForDate(newDate);
    if (hours.closed) {
      setError(
        "W poniedziałki restauracja jest zamknięta. Prosimy wybrać inny dzień.",
      );
    } else {
      setError(null);
    }
  };

  const handleCustomPrefixChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    if (digits.length > 0) {
      setCustomPrefix(`+${digits}`);
    } else if (raw.startsWith("+")) {
      setCustomPrefix("+");
    } else {
      setCustomPrefix("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitted(false);
    setAssignedTable(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const dateVal = formData.get("date");
    const timeVal = formData.get("time");

    if (dateVal < getTodayDateString() || isDateTimeInPast(dateVal, timeVal)) {
      setError("Nie można dokonać rezerwacji na termin z przeszłości.");
      return;
    }

    const hours = getOpeningHoursForDate(dateVal);
    if (hours.closed) {
      setError(
        "W poniedziałki restauracja jest zamknięta. Zapraszamy od wtorku do niedzieli.",
      );
      return;
    }

    const reqMinutes = timeToMinutes(timeVal);
    if (
      reqMinutes < timeToMinutes(hours.open) ||
      reqMinutes > timeToMinutes(hours.close)
    ) {
      setError(
        `W wybranym dniu restauracja czynna jest w godzinach ${hours.open}–${hours.close}.`,
      );
      return;
    }

    setIsSubmitting(true);

    const activePrefix =
      phonePrefix === "other"
        ? customPrefix.trim().startsWith("+")
          ? customPrefix.trim()
          : `+${customPrefix.trim()}`
        : phonePrefix;
    const rawPhone = String(formData.get("phone") || "").trim();
    const fullPhone = rawPhone.startsWith("+")
      ? rawPhone
      : `${activePrefix} ${rawPhone}`;

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: fullPhone,
      reservation_date: dateVal,
      reservation_time: timeVal,
      guests: Number(formData.get("guests")),
    };

    try {
      const response = await fetch("http://localhost:5000/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się zapisać rezerwacji.");
      }

      setAssignedTable(data.reservation?.table_number ?? null);
      setIsSubmitted(true);
      form.reset();
      setSelectedDate("");
      setPhonePrefix("+48");
      setCustomPrefix("+");
    } catch (err) {
      setError(err.message || "Błąd połączenia z serwerem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      <section className="section reservation" id="rezerwacja">
        <div className="container reservation__grid">
          <div className="reservation__intro">
            <p className="eyebrow">Twój stolik czeka</p>
            <h2>Dołącz do nas.</h2>
            <p>
              Rezerwacji można dokonać do 30 dni z wyprzedzeniem. Kilka miejsc
              przy barze zawsze zostawiamy dla gości bez rezerwacji.
            </p>
            <p className="questions">
              Pytania? <a href="tel:+15035550182">(503) 555-0182</a>
            </p>
          </div>

          <form className="form" id="reservation-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Imię i nazwisko</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Jan Kowalski"
                autoComplete="name"
                minLength={3}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="jan@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Telefon</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    phonePrefix === "other" ? "130px 90px 1fr" : "130px 1fr",
                  gap: "1rem",
                  alignItems: "end",
                }}
              >
                <select
                  id="phone-prefix"
                  name="phone_prefix"
                  value={phonePrefix}
                  onChange={(e) => setPhonePrefix(e.target.value)}
                  aria-label="Kierunkowy kraju"
                >
                  <option value="+48">🇵🇱 +48 (PL)</option>
                  <option value="+49">🇩🇪 +49 (DE)</option>
                  <option value="+44">🇬🇧 +44 (UK)</option>
                  <option value="+39">🇮🇹 +39 (IT)</option>
                  <option value="+380">🇺🇦 +380 (UA)</option>
                  <option value="+420">🇨🇿 +420 (CZ)</option>
                  <option value="+421">🇸🇰 +421 (SK)</option>
                  <option value="+33">🇫🇷 +33 (FR)</option>
                  <option value="+34">🇪🇸 +34 (ES)</option>
                  <option value="+1">🇺🇸 +1 (US)</option>
                  <option value="other">Inny</option>
                </select>
                {phonePrefix === "other" && (
                  <input
                    type="text"
                    name="custom_prefix"
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
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="600 700 800"
                  autoComplete="tel-national"
                  pattern="[\d\s()\-]{6,15}"
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="date">Data</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={handleDateChange}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="time">
                  Godzina
                  {selectedDate && !openingHours.closed
                    ? ` (${openingHours.open}–${openingHours.close})`
                    : ""}
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  min={openingHours.open || "17:00"}
                  max={openingHours.close || "22:30"}
                  step={900}
                  disabled={openingHours.closed}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="guests">Liczba osób</label>
              <select id="guests" name="guests" required defaultValue="2">
                <option value="1">1 osoba</option>
                <option value="2">2 osoby</option>
                <option value="3">3 osoby</option>
                <option value="4">4 osoby</option>
                <option value="5">5 osób</option>
                <option value="6">6 osób</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn--dark"
              disabled={isSubmitting || openingHours.closed}
            >
              {isSubmitting ? "Wysyłanie..." : "Potwierdź rezerwację"}{" "}
              <span aria-hidden="true">→</span>
            </button>

            <p className="form__note">
              Dla grup powyżej 6 osób prosimy o kontakt telefoniczny.
            </p>

            {error && (
              <p className="error" role="alert" style={{ marginTop: "1rem" }}>
                {error}
              </p>
            )}

            {isSubmitted && (
              <p
                className="success"
                id="potwierdzenie"
                role="status"
                style={{ display: "block" }}
              >
                Dziękujemy! Twoja rezerwacja została przyjęta
                {assignedTable ? ` (Stolik nr ${assignedTable}).` : "."}
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
