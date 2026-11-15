import { useState, useEffect } from 'react';

export default function Kontakt() {
  const [openingHours, setOpeningHours] = useState([]);
  const [hoursLoaded, setHoursLoaded] = useState(false);

  useEffect(() => {
    fetch('http://localhost:4000/api/opening-hours')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setOpeningHours(data);
        }
      })
      .catch((err) => {
        console.error('Błąd pobierania godzin otwarcia:', err);
      })
      .finally(() => {
        setHoursLoaded(true);
      });
  }, []);

  return (
    <main className="main-content">
      {/* BANER HERO DLA PODSTRONY KONTAKTU */}
      <section className="hero-section">
        <div className="hero-content">
          <p className="subtitle-tag">Get in touch</p>
          <h1 className="page-title">Skontaktuj się z nami</h1>
          <p className="hero-description">Zapraszamy do kontaktu w sprawie rezerwacji stolików oraz organizacji wydarzeń.</p>
        </div>
      </section>

      {/* GŁÓWNA TREŚĆ KONTAKTU */}
      <div className="contact-grid">
        
        {/* Szczegóły kontaktowe */}
        <div className="contact-details">
          <div className="detail-block">
            <h2>Lokalizacja</h2>
            <p>ul. Smakowita 12</p>
            <p>31-001 Kraków, Polska</p>
          </div>
          
          <div className="detail-block">
            <h2>Godziny otwarcia</h2>
            {!hoursLoaded ? (
              <p>Ładowanie godzin otwarcia...</p>
            ) : openingHours.length > 0 ? (
              openingHours.map((row) => (
                <p key={row.id}>
                  {row.days_label}:{' '}
                  {row.open_time && row.close_time
                    ? `${String(row.open_time).slice(0, 5)} — ${String(row.close_time).slice(0, 5)}`
                    : 'Zamknięte'}
                </p>
              ))
            ) : (
              <p>Brak danych o godzinach otwarcia.</p>
            )}
          </div>
          
          <div className="detail-block">
            <h2>Bezpośredni kontakt</h2>
            <p>Telefon: <a href="tel:+48123456789">+48 123 456 789</a></p>
            <p>E-mail: <a href="mailto:kontakt@osteriadelsole.pl">kontakt@osteriadelsole.pl</a></p>
          </div>
        </div>

        {/* Formularz kontaktowy */}
        <div className="form-section">
          <h2>Formularz kontaktowy</h2>
          <form className="contact-form">
            <div className="form-row">
              <div className="form-group">
                <label>Imię i Nazwisko *</label>
                <input type="text" required />
              </div>
              <div className="form-group">
                <label>Adres E-mail *</label>
                <input type="email" required />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Numer telefonu</label>
                <input type="tel" />
              </div>
              <div className="form-group">
                <label>Temat wiadomości *</label>
                <select required defaultValue="">
                  <option value="" disabled>Wybierz temat...</option>
                  <option value="rezerwacja">Rezerwacja stolika</option>
                  <option value="wydarzenie">Prywatne wydarzenie</option>
                  <option value="opinia">Opinie, sugestie lub skargi</option>
                  <option value="ogolne">Zapytanie ogólne</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Treść wiadomości *</label>
              <textarea rows={5} required />
            </div>
            
            <button type="submit" className="submit-button">Wyślij wiadomość</button>
          </form>
        </div>

      </div>
    </main>
  );
}
