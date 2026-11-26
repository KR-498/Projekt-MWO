import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, phone, password);
      }
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-overlay" onClick={() => setIsAuthModalOpen(false)}>
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--cream)',
          width: '100%',
          maxWidth: '420px',
          margin: 'auto',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        <button
          onClick={() => setIsAuthModalOpen(false)}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1.2rem',
            background: 'none',
            border: 'none',
            fontSize: '1.6rem',
            cursor: 'pointer',
            color: 'var(--muted)',
          }}
        >
          ×
        </button>

        <h2 style={{ fontFamily: 'var(--serif)', marginBottom: '1.2rem', textAlign: 'center' }}>
          {mode === 'login' ? 'Witaj ponownie' : 'Załóż konto'}
        </h2>

        <div className="cart-planning__toggle" style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`toggle-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            Logowanie
          </button>
          <button
            type="button"
            className={`toggle-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
          >
            Rejestracja
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="cart-planning__group">
              <label>Imię i nazwisko *</label>
              <input
                type="text"
                placeholder="Jan Kowalski"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="cart-planning__group">
            <label>Adres e-mail *</label>
            <input
              type="email"
              placeholder="jan@domena.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode === 'register' && (
            <div className="cart-planning__group">
              <label>Telefon (opcjonalnie)</label>
              <input
                type="tel"
                placeholder="+48 600 700 800"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          )}

          <div className="cart-planning__group">
            <label>Hasło *</label>
            <input
              type="password"
              placeholder="Minimum 6 znaków"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && <p className="cart-planning__error">{error}</p>}

          <button
            type="submit"
            className="cart-sidebar__submit-btn"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Przetwarzanie...' : mode === 'login' ? 'Zaloguj się' : 'Zarejestruj się'}
          </button>
        </form>
      </div>
    </div>
  );
}
