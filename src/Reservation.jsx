import { useState } from 'react';

export default function Reservation() {
  // Stan do kontrolowania wyświetlania komunikatu o sukcesie
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Funkcja obsługująca wysłanie formularza bez przeładowania strony
  const handleSubmit = (e) => {
    e.preventDefault(); // Zatrzymujemy domyślne przeładowanie strony URL
    setIsSubmitted(true); // Pokazujemy zielony komunikat o sukcesie
  };

  return (
    <main>
      <section className="section reservation" id="rezerwacja">
        {/* Usunąłem klasę reveal, żeby sekcja była od razu widoczna bez skryptu scrollowania */}
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
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="+48 600 700 800"
                autoComplete="tel"
                pattern="\+?[\d\s()\-]{9,}"
                required
              />
            </div>
            
            <div className="field-row">
              <div className="field">
                <label htmlFor="date">Data</label>
                <input type="date" id="date" name="date" required />
              </div>
              <div className="field">
                <label htmlFor="time">Godzina</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  min="17:00"
                  max="22:00"
                  step={900}
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
            
            <button type="submit" className="btn btn--dark">
              Potwierdź rezerwację <span aria-hidden="true">→</span>
            </button>
            
            <p className="form__note">
              Dla grup powyżej 6 osób prosimy o kontakt telefoniczny.
            </p>

            {/* Komunikat o sukcesie - renderuje się tylko, gdy isSubmitted === true */}
            {isSubmitted && (
              <p className="success" id="potwierdzenie" role="status" style={{ display: 'block' }}>
                Dziękujemy! Twoja rezerwacja została przyjęta.
              </p>
            )}
          </form>

        </div>
      </section>
    </main>
  );
}
