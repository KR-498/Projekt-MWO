const navmenu = `
  <div class="site-brand">
    <button class="brand">
      <div class="brand-mark">S</div>
      <div>
        <strong>WSPANIAŁY TYTUŁ</strong>
        <small>RESTAURACJA</small>
      </div>
    </button>
  </div>
  <nav class="nav">
    <div class="nav-links">    
      <a href="index.html" id="nav-home">Główna</a>
      <a href="about.html" id="nav-about">O nas</a>
      <a href="reservation.html" id="nav-reservation">Rezerwacje</a>
      <a href="kontakt.html" id="nav-contact">Kontakt</a>
    </div>
  </nav>`;

// 2. Wstrzykujemy menu do nagłówka strony
document.getElementById("hednav").innerHTML = navmenu;

// 3. Automatyczne wykrywanie obecnej strony i przypisywanie ramki
const currentPath = window.location.pathname;

// Resetujemy klasę ramki na start
document.getElementById("nav-home").classList.remove("nav-reserve");
document.getElementById("nav-about").classList.remove("nav-reserve");
document.getElementById("nav-reservation").classList.remove("nav-reserve");
document.getElementById("nav-contact").classList.remove("nav-reserve");

// Przypisujemy ramkę w zależności od pliku, w którym się znajdujemy
if (currentPath.includes("about.html")) {
  document.getElementById("nav-about").classList.add("nav-reserve");
} else if (currentPath.includes("reservation.html")) {
  document.getElementById("nav-reservation").classList.add("nav-reserve");
} else if (currentPath.includes("kontakt.html")) {
  document.getElementById("nav-contact").classList.add("nav-reserve");
} else if (currentPath.includes("index.html") || currentPath === "/" || currentPath.endsWith("/")) {
  // Jeśli jesteśmy na głównej, możemy opcjonalnie podświetlić "Główna" 
  // lub zostawić menu całkowicie bez ramek. Jeśli chcesz ramkę na głównej, odkomentuj poniższą linię:
   document.getElementById("nav-home").classList.add("nav-reserve");
}