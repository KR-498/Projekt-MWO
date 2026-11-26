import { useState, useEffect } from 'react';
import './assets/fontello/css/fontello.css';
import './About.css';

export default function About() {
  const [openingHours, setOpeningHours] = useState([]);
  const [hoursLoaded, setHoursLoaded] = useState(false);

  useEffect(() => {
    const fetchHours = () => {
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
    };

    fetchHours();
    window.addEventListener('opening-hours-updated', fetchHours);
    return () => window.removeEventListener('opening-hours-updated', fetchHours);
  }, []);

  return (
      <>
        <main className="section">
          <div className="container container--narrow">
            {/* Nagłówek sekcji O nas */}
            <header className="center about-header">
              <p className="eyebrow">Poznaj nas</p>
              <h2>O naszej restauracji</h2>
              <p className="about-lead">
                Poznaj naszą historię, pasję i ludzi, którzy tworzą to miejsce każdego dnia.
              </p>
            </header>

            {/* Sekcja: Nasza Historia */}
            <section className="about-section">
              <p className="eyebrow">Początki</p>
              <h2>Nasza Historia</h2>
              <article className="about-article">
                <p>
                  <strong>Wspaniała Restauracja</strong> powstała z prostej, ale bezkompromisowej pasji: chęci dzielenia się jedzeniem, które zbliża ludzi.
                </p>
                <p>
                  Nasza przygoda rozpoczęła się w 2025 roku w sercu Tarnowa. Z połączenia miłości do lokalnej tradycji oraz apetytu na nowoczesne wyzwania kulinarne stworzyliśmy przestrzeń, w której każdy posiłek staje się wyjątkowym doświadczeniem.
                </p>
              </article>
            </section>

            {/* Sekcja: Nasza Filozofia */}
            <section className="about-section">
              <p className="eyebrow">Wartości</p>
              <h2>Nasza Filozofia</h2>

              <blockquote className="about-quote">
                <p>„Wierzymy, że dobra restauracja to coś więcej niż świetne menu — to atmosfera, zapachy budzące wspomnienia i gościnność, do której chce się wracać”.</p>
                <footer>
                  <cite>— Zespół Restauracji</cite>
                </footer>
              </blockquote>

              <h3 className="about-subheading">Czym kierujemy się w kuchni?</h3>
              <ul className="about-values">
                <li>
                  <strong>Świeżość bez kompromisów:</strong>
                  <span>Wszystkie dania przygotowujemy od podstaw, korzystając z surowców dostarczanych codziennie rano przez lokalnych gospodarzy.</span>
                </li>
                <li>
                  <strong>Szacunek do produktu:</strong>
                  <span>Łączymy klasyczne techniki kulinarne z nowoczesnymi trendami, wyciągając z każdego składnika jego głębię smaku.</span>
                </li>
                <li>
                  <strong>Sezonowość:</strong>
                  <span>Nasze menu zmienia się wraz z porami roku — serwujemy to, co w danym momencie natura ma najlepszego do zaoferowania.</span>
                </li>
              </ul>
            </section>

            {/* Sekcja: Zespół i pasja */}
            <section className="about-section--compact">
              <p className="eyebrow">Ludzie</p>
              <h2>Zespół i pasja</h2>
              <article className="about-article">
                <p>
                  Za naszą kuchnią stoi zespół pasjonatów pod wodzą Szefa Kuchni <strong>Kacpra Radonia</strong>, dla którego gotowanie jest sztuką opowiadania historii.
                </p>
                <p>
                  Dbamy o to, aby na Waszych talerzach lądowały kompozycje przemyślane w najmniejszym detalu, a obsługa na sali sprawiała, że poczujecie się u nas jak w domu.
                </p>
              </article>
            </section>
          </div>
        </main>

        {/* Stopka dolna */}
        <footer className="find">
          <div className="find__img" role="img" style={{ backgroundImage: "url('res/about-footer.avif')" }}></div>
          <div className="find__text">
            <p className="eyebrow eyebrow--gold">Znajdź nas</p>
            <h2>Odwiedź naszą restaurację.</h2>
            <div className="find__info">
              <div>
                <h3>Adres</h3>
                <address className="about-address">
                  418 SE Division Street<br />
                  Portland, Oregon 97202
                </address>
              </div>
              <div>
                <h3>Godziny otwarcia</h3>
                {!hoursLoaded ? (
                    <p>Ładowanie godzin otwarcia...</p>
                ) : openingHours.length > 0 ? (
                    <p>
                      {openingHours.map((row, index) => (
                          <span key={row.id ?? index}>
                      {index > 0 && <br />}
                            {row.days_label}{' '}
                            {row.open_time && row.close_time
                                ? `${String(row.open_time).slice(0, 5)}–${String(row.close_time).slice(0, 5)}`
                                : 'Zamknięte'}
                    </span>
                      ))}
                    </p>
                ) : (
                    <p>Brak danych o godzinach otwarcia.</p>
                )}
              </div>
              <div>
                <h3>Kontakt</h3>
                <p>
                  Telefon: <a href="tel:+15035550182">(503) 555-0182</a><br />
                  E-mail: <a href="mailto:ciao@osteria.example">ciao@osteria.example</a>
                </p>
              </div>
              <div>
                <h3>Social media</h3>
                <ul className="social about-social">
                  <li>
                    <a href="#" aria-label="Instagram">
                      <i className="icon-instagram"></i>
                    </a>
                  </li>
                  <li>
                    <a href="#" aria-label="Facebook">
                      <i className="icon-facebook"></i>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <p className="copy">© 2026 Restauracja. Wszelkie prawa zastrzeżone.</p>
          </div>
        </footer>
      </>
  );
}