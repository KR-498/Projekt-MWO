(() => {
  'use strict';

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  const form = document.getElementById('reservation-form');
  const success = document.getElementById('success');
  const dateInput = document.getElementById('date');

  const fmt = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const today = new Date();
  const max = new Date(); max.setDate(max.getDate() + 30);
  dateInput.min = fmt(today);
  dateInput.max = fmt(max);

  const rules = {
    name: v => v.trim().length >= 3 && v.trim().includes(' ') ? '' : 'Podaj imię i nazwisko.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Podaj poprawny adres e-mail.',
    phone: v => /^\+?[\d\s()-]{9,}$/.test(v.trim()) ? '' : 'Podaj poprawny numer telefonu.',
    date: v => !v ? 'Wybierz datę.' : (v < dateInput.min || v > dateInput.max ? 'Rezerwacja możliwa do 30 dni naprzód.' : ''),
    time: v => !v ? 'Wybierz godzinę.' : (v < '17:00' || v > '22:00' ? 'Przyjmujemy rezerwacje 17:00–22:00.' : '')
  };

  function validateField(name) {
    const input = form.elements[name];
    const msg = rules[name](input.value);
    input.closest('.field').classList.toggle('invalid', !!msg);
    input.setAttribute('aria-invalid', !!msg);
    document.getElementById('err-' + name).textContent = msg;
    return !msg;
  }

  Object.keys(rules).forEach(name => {
    const input = form.elements[name];
    input.addEventListener('blur', () => validateField(name));
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('invalid')) validateField(name);
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    success.hidden = true;
    const results = Object.keys(rules).map(validateField);
    if (results.includes(false)) {
      const firstBad = form.querySelector('.invalid input, .invalid select');
      if (firstBad) firstBad.focus();
      return;
    }
    const d = new Date(form.elements.date.value + 'T00:00');
    const dateStr = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    const guests = form.elements.guests.value;
    const first = form.elements.name.value.trim().split(' ')[0];
    success.textContent = `Dziękujemy, ${first}! Stolik dla ${guests} os. czeka na Ciebie ${dateStr} o ${form.elements.time.value}. Potwierdzenie wyślemy na ${form.elements.email.value}.`;
    success.hidden = false;
    form.reset();
    form.elements.guests.value = '2';
  });
})();

