import { useState, useEffect, useMemo } from "react";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";

const API_URL = "http://localhost:4000";

function parseNumericPrice(rawValue) {
  if (typeof rawValue === "number" && !Number.isNaN(rawValue)) {
    return rawValue;
  }
  if (typeof rawValue === "string") {
    const normalized = rawValue.replace(",", ".").replace(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function getEffectivePrice(dish) {
  const activePrice = dish.promo_price ?? dish.discount_price ?? dish.price;
  return parseNumericPrice(activePrice);
}

export default function Menu() {
  const [dishes, setDishes] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Wszystkie");
  const [sortBy, setSortBy] = useState("default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // PODPIĘCIE GLOBALNEGO KOSZYKA I AUTORYZACJI
  const { addToCart } = useCart();
  const auth = useAuth();
  const currentUser = auth?.user || null;
  const token =
    auth?.token ||
    localStorage.getItem("restauracja_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  // STANY MODALU KONFIGURACJI ZAMAWIANIA
  const [selectedDish, setSelectedDish] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // STANY FORMULARZA OCENY POTRAWY
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  useEffect(() => {
    const loadMenuAndReviews = async () => {
      try {
        const dishesRes = await fetch(`${API_URL}/api/dishes`);
        if (!dishesRes.ok) throw new Error("Błąd połączenia z serwerem");
        const dishesData = await dishesRes.json();
        setDishes(dishesData);

        try {
          const reviewsRes = await fetch(`${API_URL}/api/reviews`);
          if (reviewsRes.ok) {
            const reviewsData = await reviewsRes.json();
            setAllReviews(Array.isArray(reviewsData) ? reviewsData : []);
          }
        } catch {
          setAllReviews([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMenuAndReviews();
  }, []);

  // Wyliczanie średniej oceny i liczby opinii dla każdego dania
  const reviewStatsByDish = useMemo(() => {
    const grouped = {};
    for (const rev of allReviews) {
      if (!grouped[rev.dish_id]) {
        grouped[rev.dish_id] = { sum: 0, count: 0 };
      }
      grouped[rev.dish_id].sum += Number(rev.rating) || 0;
      grouped[rev.dish_id].count += 1;
    }

    const stats = {};
    for (const [dishId, val] of Object.entries(grouped)) {
      stats[dishId] = {
        average: Number((val.sum / val.count).toFixed(1)),
        count: val.count,
      };
    }
    return stats;
  }, [allReviews]);

  const categories = useMemo(
    () => ["Wszystkie", ...new Set(dishes.map((d) => d.category_name))],
    [dishes],
  );

  const displayedDishes = useMemo(() => {
    const filtered =
      activeCategory === "Wszystkie"
        ? dishes
        : dishes.filter((d) => d.category_name === activeCategory);

    if (sortBy === "default") {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return getEffectivePrice(a) - getEffectivePrice(b);
        case "price-desc":
          return getEffectivePrice(b) - getEffectivePrice(a);
        case "rating-desc": {
          const avgA = reviewStatsByDish[a.id]?.average ?? -1;
          const avgB = reviewStatsByDish[b.id]?.average ?? -1;
          return avgB - avgA;
        }
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "", "pl", {
            sensitivity: "base",
          });
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "", "pl", {
            sensitivity: "base",
          });
        default:
          return 0;
      }
    });
  }, [dishes, activeCategory, sortBy, reviewStatsByDish]);

  const selectedDishReviews = useMemo(() => {
    if (!selectedDish) return [];
    return allReviews.filter(
      (rev) => Number(rev.dish_id) === Number(selectedDish.id),
    );
  }, [allReviews, selectedDish]);

  // Sprawdzenie, czy zalogowany użytkownik już ocenił wybrane danie
  const userExistingReview = useMemo(() => {
    if (!selectedDish || !currentUser) return null;
    return (
      selectedDishReviews.find(
        (rev) =>
          (currentUser.id && Number(rev.user_id) === Number(currentUser.id)) ||
          (currentUser.email &&
            String(rev.user_email || "").toLowerCase() ===
              String(currentUser.email).toLowerCase()),
      ) || null
    );
  }, [selectedDish, selectedDishReviews, currentUser]);

  const isAdmin =
    currentUser?.role === "admin" &&
    String(currentUser?.email || "").toLowerCase() === "admin@admin.com";

  const handleOpenOrdering = (dish) => {
    setSelectedDish(dish);
    setQuantity(1);
    setNotes("");
    setReviewRating(5);
    setReviewComment("");
    setReviewError("");
    setReviewSuccess("");
  };

  const handleConfirmOrder = () => {
    const orderPayload = {
      dish_id: selectedDish.id,
      name: selectedDish.name,
      price: getEffectivePrice(selectedDish),
      quantity: quantity,
      special_notes: notes,
      total_price: getEffectivePrice(selectedDish) * quantity,
    };

    addToCart(orderPayload);
    setSelectedDish(null);
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    setReviewError("");
    setReviewSuccess("");

    if (!token) {
      setReviewError("Zaloguj się, aby wystawić ocenę.");
      return;
    }

    if (userExistingReview) {
      setReviewError("Możesz wystawić tylko jedną ocenę dla tego dania.");
      return;
    }

    try {
      setReviewSubmitting(true);
      const res = await fetch(
        `${API_URL}/api/dishes/${selectedDish.id}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: Number(reviewRating),
            comment: reviewComment.trim() || null,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się zapisać opinii.");
      }

      if (data.review) {
        setAllReviews((prev) => [data.review, ...prev]);
      }
      setReviewComment("");
      setReviewRating(5);
      setReviewSuccess(data.message || "Dziękujemy za wystawienie oceny!");
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!token || !isAdmin) return;

    try {
      const res = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się usunąć opinii.");
      }

      setAllReviews((prev) => prev.filter((rev) => rev.id !== reviewId));
    } catch (err) {
      setReviewError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="container section center">
        <p>Ładowanie menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container section center">
        <p className="menu__error">Błąd: {error}</p>
      </div>
    );
  }

  return (
    <main className="section">
      <div className="container">
        <header className="center menu__header">
          <p className="eyebrow">Tradycja i Smak</p>
          <h2>Karta Dań</h2>
          <p className="menu__intro">
            Wszystkie potrawy przygotowujemy ze świeżych, lokalnych produktów
            według tradycyjnych włoskich receptur.
          </p>
        </header>

        <div className="tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`tab ${activeCategory === cat ? "is-active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="menu__controls">
          <label htmlFor="menu-sort" className="menu__sort-label">
            Sortuj według:
          </label>
          <select
            id="menu-sort"
            className="menu__sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">Domyślnie (kolejność w karcie)</option>
            <option value="price-asc">Cena: od najniższej</option>
            <option value="price-desc">Cena: od najwyższej</option>
            <option value="rating-desc">Ocena: od najwyższej</option>
            <option value="name-asc">Nazwa: A–Z</option>
            <option value="name-desc">Nazwa: Z–A</option>
          </select>
        </div>

        <div className="panel">
          <ul className="dishes">
            {displayedDishes.map((dish) => {
              const stats = reviewStatsByDish[dish.id];

              return (
                <li
                  key={dish.id}
                  className="dish-card"
                  onClick={() => handleOpenOrdering(dish)}
                >
                  <img
                    src={dish.image_url}
                    alt={dish.name}
                    className="dish-card__img"
                  />
                  <div>
                    <div className="dish__row">
                      <h3>{dish.name}</h3>
                      <div className="dish__line"></div>
                      <span className="price">
                        {getEffectivePrice(dish).toFixed(2)} zł
                      </span>
                    </div>
                    <p>{dish.description}</p>

                    <div className="dish__meta">
                      {dish.tag && <span className="tag">{dish.tag}</span>}
                      <span
                        className={`dish__rating-badge ${stats ? "has-reviews" : ""}`}
                      >
                        {stats
                          ? `★ ${stats.average.toFixed(1)} (${stats.count})`
                          : "Brak ocen — kliknij, aby ocenić"}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* INTERFEJS ZAMAWIANIA I OPINII (MODAL) */}
      {selectedDish && (
        <div
          className="menu-modal-overlay"
          onClick={() => setSelectedDish(null)}
        >
          <div
            className="menu-modal-content menu-modal-content--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="menu-modal-close"
              onClick={() => setSelectedDish(null)}
            >
              ×
            </button>

            <p className="eyebrow menu-modal__eyebrow">
              Konfiguracja zamówienia
            </p>
            <h2 className="menu-modal__title">{selectedDish.name}</h2>
            <p className="price menu-modal__price">
              {(getEffectivePrice(selectedDish) * quantity).toFixed(2)} zł
            </p>

            <div className="menu-modal-form-group">
              <label>Ilość porcji:</label>
              <div className="quantity-selector">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  -
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)}>
                  +
                </button>
              </div>
            </div>

            <div className="menu-modal-form-group">
              <label htmlFor="order-notes">
                Uwagi do kucharza (np. bez cebuli):
              </label>
              <textarea
                id="order-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Wpisz swoje życzenia..."
                rows={3}
              />
            </div>

            <button
              type="button"
              className="menu-modal-submit-btn"
              onClick={handleConfirmOrder}
            >
              Dodaj do zamówienia
            </button>

            {/* SEKCJA OCEN I OPINII O POTRAWIE */}
            <section className="menu-reviews">
              <div className="menu-reviews__header">
                <h4 className="menu-reviews__heading">
                  Opinie klientów ({selectedDishReviews.length})
                </h4>
                <span className="menu-reviews__avg">
                  {reviewStatsByDish[selectedDish.id]
                    ? `Średnia: ${reviewStatsByDish[selectedDish.id].average.toFixed(1)} / 5 ★`
                    : "Brak ocen"}
                </span>
              </div>

              {token ? (
                userExistingReview ? (
                  <div className="menu-reviews__guest-box">
                    <span>
                      Już oceniłeś to danie ({userExistingReview.rating}/5 ★) — każdy zarejestrowany użytkownik może wystawić tylko jedną ocenę dla danego dania.
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleAddReview}
                    className="menu-reviews__form"
                  >
                    <label className="menu-reviews__label">Twoja ocena:</label>
                    <div className="menu-reviews__stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          aria-label={`Ocena ${star} na 5`}
                          className={`menu-reviews__star-btn ${
                            star <= reviewRating ? "is-active" : ""
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Napisz krótką opinię o tym daniu (opcjonalnie)..."
                      rows={2}
                    />

                    <button
                      type="submit"
                      className="menu-reviews__submit-btn"
                      disabled={reviewSubmitting}
                    >
                      {reviewSubmitting ? "Zapisywanie..." : "Oceń"}
                    </button>
                  </form>
                )
              ) : (
                <div className="menu-reviews__guest-box">
                  {typeof auth?.setIsAuthModalOpen === "function" ? (
                    <button
                      type="button"
                      className="menu-reviews__login-link"
                      onClick={() => {
                        setSelectedDish(null);
                        auth.setIsAuthModalOpen(true);
                      }}
                    >
                      Zaloguj się lub zarejestruj, aby wystawić ocenę tej potrawie.
                    </button>
                  ) : (
                    <span>
                      Zaloguj się lub zarejestruj, aby wystawić ocenę tej
                      potrawie.
                    </span>
                  )}
                </div>
              )}

              {reviewError && (
                <p className="menu-reviews__error">{reviewError}</p>
              )}
              {reviewSuccess && (
                <p className="menu-reviews__success">{reviewSuccess}</p>
              )}

              {selectedDishReviews.length === 0 ? (
                <p className="menu-reviews__empty">
                  Nikt jeszcze nie ocenił tego dania. Bądź pierwszy!
                </p>
              ) : (
                <ul className="menu-reviews__list">
                  {selectedDishReviews.map((rev) => (
                    <li key={rev.id} className="menu-reviews__item">
                      <div className="menu-reviews__item-top">
                        <div>
                          <strong className="menu-reviews__author">
                            {rev.user_name}
                          </strong>
                          <span className="menu-reviews__email">
                            ({rev.user_email})
                          </span>
                        </div>
                        <span className="menu-reviews__item-stars">
                          {"★".repeat(rev.rating)}
                          {"☆".repeat(5 - rev.rating)}
                        </span>
                      </div>

                      <div className="menu-reviews__date">
                        {new Date(rev.created_at).toLocaleString("pl-PL", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>

                      {rev.comment && (
                        <p className="menu-reviews__comment">{rev.comment}</p>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          className="menu-reviews__delete-btn"
                          onClick={() => handleDeleteReview(rev.id)}
                        >
                          Usuń opinię
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}