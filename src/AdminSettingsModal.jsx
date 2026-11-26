import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { ISO_DAYS, expandRowsToWeekSchedule } from "./openingHoursUtils";

function AdminSettingsDialog({ token, onClose }) {
  const [schedule, setSchedule] = useState(() =>
    ISO_DAYS.map(({ iso, label }) => ({
      isoDay: iso,
      label,
      isOpen: false,
      openTime: "17:00",
      closeTime: "22:00",
    })),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch("http://localhost:4000/api/opening-hours")
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać godzin otwarcia.");
        return res.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setSchedule(expandRowsToWeekSchedule(data));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Błąd połączenia z serwerem.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateDayField = (isoDay, field, value) => {
    setSuccessMsg(null);
    setError(null);
    setSchedule((prev) =>
      prev.map((day) =>
        day.isoDay === isoDay ? { ...day, [field]: value } : day,
      ),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const res = await fetch("http://localhost:4000/api/opening-hours", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schedule }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `Serwer zwrócił nieoczekiwaną odpowiedź (${res.status}) — zatrzymaj (Ctrl+C) i uruchom ponownie serwer backendu (node server.js / npm run dev:all).`,
        );
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się zapisać zmian.");
      }

      if (Array.isArray(data.rows)) {
        setSchedule(expandRowsToWeekSchedule(data.rows));
      }
      setSuccessMsg("Godziny otwarcia zostały zaktualizowane w bazie danych.");
      window.dispatchEvent(new Event("opening-hours-updated"));
    } catch (err) {
      setError(err.message || "Błąd podczas zapisywania godzin otwarcia.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cart-overlay admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="admin-settings-modal__close"
          onClick={onClose}
          aria-label="Zamknij ustawienia"
        >
          ×
        </button>

        <p className="eyebrow" style={{ marginBottom: "0.3rem" }}>
          Panel administratora
        </p>
        <h2 className="admin-settings-modal__title">Godziny otwarcia</h2>
        <hr style={{ margin: "20px 0" }} />

        {loading ? (
          <p className="admin-settings-modal__loading">
            Pobieranie aktualnych godzin z bazy...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="admin-settings-form">
            <div className="admin-hours-list">
              {schedule.map((day) => (
                <div
                  key={day.isoDay}
                  className={`admin-hours-row ${day.isOpen ? "" : "is-closed"}`}
                >
                  <div className="admin-hours-row__day">
                    <label className="admin-hours-toggle">
                      <input
                        type="checkbox"
                        checked={day.isOpen}
                        onChange={(e) =>
                          updateDayField(day.isoDay, "isOpen", e.target.checked)
                        }
                      />
                      <span className="admin-hours-row__name">{day.label}</span>
                    </label>
                  </div>

                  {day.isOpen ? (
                    <div className="admin-hours-row__inputs">
                      <input
                        type="time"
                        step={60}
                        value={day.openTime}
                        onChange={(e) =>
                          updateDayField(day.isoDay, "openTime", e.target.value)
                        }
                        aria-label={`Godzina otwarcia – ${day.label}`}
                        required
                      />
                      <span className="admin-hours-row__sep">—</span>
                      <input
                        type="time"
                        step={60}
                        value={day.closeTime}
                        onChange={(e) =>
                          updateDayField(
                            day.isoDay,
                            "closeTime",
                            e.target.value,
                          )
                        }
                        aria-label={`Godzina zamknięcia – ${day.label}`}
                        required
                      />
                    </div>
                  ) : (
                    <span className="admin-hours-row__closed-label">
                      Zamknięte
                    </span>
                  )}
                </div>
              ))}
            </div>

            {error && <p className="cart-planning__error">{error}</p>}
            {successMsg && (
              <p className="admin-settings-modal__success">{successMsg}</p>
            )}

            <div className="admin-settings-modal__actions">
              <button
                type="button"
                className="admin-settings-modal__cancel"
                onClick={onClose}
                disabled={saving}
              >
                Zamknij
              </button>
              <button
                type="submit"
                className="cart-sidebar__submit-btn admin-settings-modal__save"
                disabled={saving}
              >
                {saving ? "Zapisywanie..." : "Zapisz w bazie"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminSettingsModal() {
  const { token, isAdmin, isAdminSettingsOpen, setIsAdminSettingsOpen } =
    useAuth();

  if (!isAdminSettingsOpen || !isAdmin) return null;

  return (
    <AdminSettingsDialog
      token={token}
      onClose={() => setIsAdminSettingsOpen(false)}
    />
  );
}
