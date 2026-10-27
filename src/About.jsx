export default function About() {
  return (
    <>
      <main className="section">
        <div className="container container--narrow">
          {/* Nagłówek sekcji O nas */}
          <header className="center" style={{ marginBottom: '4rem' }}>
            <p className="eyebrow">Poznaj nas</p>
            <h2>O naszej restauracji</h2>
            <p style={{ color: 'var(--muted)', fontSize: '1.05rem', marginTop: '1rem' }}>
              Poznaj naszą historię, pasję i ludzi, którzy tworzą to miejsce każdego dnia.
            </p>
          </header>

          {/* Sekcja: Nasza Historia */}
          <section style={{ marginBottom: '4rem' }}>
            <p className="eyebrow">Początki</p>
            <h2>Nasza Historia</h2>
            <article style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.8, marginTop: '1.5rem' }}>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Wspaniała Restauracja</strong> powstała z prostej, ale bezkompromisowej pasji: chęci dzielenia się jedzeniem, które zbliża ludzi.
              </p>
              <p>
                Nasza przygoda rozpoczęła się w 2025 roku w sercu Tarnowa. Z połączenia miłości do lokalnej tradycji oraz apetytu na nowoczesne wyzwania kulinarne stworzyliśmy przestrzeń, w której każdy posiłek staje się wyjątkowym doświadczeniem.
              </p>
            </article>
          </section>

          {/* Sekcja: Nasza Filozofia */}
          <section style={{ marginBottom: '4rem' }}>
            <p className="eyebrow">Wartości</p>
            <h2>Nasza Filozofia</h2>

            <blockquote style={{ borderLeft: '3px solid var(--burgundy)', paddingLeft: '1.5rem', margin: '2rem 0', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.25rem', color: 'var(--ink)' }}>
              <p>„Wierzymy, że dobra restauracja to coś więcej niż świetne menu — to atmosfera, zapachy budzące wspomnienia i gościnność, do której chce się wrać”.</p>
              <footer style={{ fontFamily: 'var(--sans)', fontStyle: 'normal', fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.75rem' }}>
                <cite>— Zespół Restauracji</cite>
              </footer>
            </blockquote>

            <h3 style={{ fontSize: '1.4rem', marginTop: '2.5rem', marginBottom: '1rem' }}>Czym kierujemy się w kuchni?</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1.5rem' }}>
              <li style={{ borderBottom: '1px solid var(--line)', paddingBottom: '1rem' }}>
                <strong style={{ color: 'var(--burgundy)' }}>Świeżość bez kompromisów:</strong>
                <span style={{ color: 'var(--muted)', fontSize: '0.9rem', display: 'block', marginTop: '0.25rem' }}>Wszystkie dania przygotowujemy od podstaw, korzystając z surowców dostarczanych codziennie rano przez lokalnych gospodarzy.</span>
              </li>
              <li style={{ borderBottom: '1px solid var(--line)', paddingBottom: '1rem' }}>
                <strong style={{ color: 'var(--burgundy)' }}>Szacunek do produktu:</strong>
                <span style={{ color: 'var(--muted)', fontSize: '0.9rem', display: 'block', marginTop: '0.25rem' }}>Łączymy klasyczne techniki kulinarne z nowoczesnymi trendami, wyciągając z każdego składnika jego głębię smaku.</span>
              </li>
              <li style={{ borderBottom: '1px solid var(--line)', paddingBottom: '1rem' }}>
                <strong style={{ color: 'var(--burgundy)' }}>Sezonowość:</strong>
                <span style={{ color: 'var(--muted)', fontSize: '0.9rem', display: 'block', marginTop: '0.25rem' }}>Nasze menu zmienia się wraz z porami roku — serwujemy to, co w danym momencie natura ma najlepszego do zaoferowania.</span>
              </li>
            </ul>
          </section>

          {/* Sekcja: Zespół i pasja */}
          <section style={{ marginBottom: '2rem' }}>
            <p className="eyebrow">Ludzie</p>
            <h2>Zespół i pasja</h2>
            <article style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.8, marginTop: '1.5rem' }}>
              <p style={{ marginBottom: '1rem' }}>
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
              <address style={{ fontStyle: 'normal' }}>
                418 SE Division Street<br />
                Portland, Oregon 97202
              </address>
            </div>
            <div>
              <h3>Godziny otwarcia</h3>
              <p>
                Wtorek–czwartek 17–22<br />
                Piątek–niedziela 17–23
              </p>
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
              <ul className="social">
                <li>
                  <a href="#" aria-label="Instagram">
                    <img src="https://jsdelivr.net" alt="Instagram" width="18" height="18" />
                  </a>
                </li>
                <li>
                  <a href="#" aria-label="Facebook">
                    <img src="https://jsdelivr.net" alt="Facebook" width="18" height="18" />
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
