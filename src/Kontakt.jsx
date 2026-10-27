export default function Kontakt() {
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
            <p className="caption">Dinner Tuesday — Sunday</p>
            <p>Wtorek — Czwartek: 17:00 — 22:30</p>
            <p>Piątek — Sobota: 17:00 — 23:30</p>
            <p>Niedziela: 16:00 — 21:30</p>
            <p>Poniedziałek: Zamknięte</p>
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
