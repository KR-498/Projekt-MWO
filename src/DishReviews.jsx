import { useState, useEffect, useCallback } from "react";

const API_URL = "http://localhost:4000";

export default function DishReviews({ dishId, token: propToken, currentUser }) {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const token =
    propToken ||
    localStorage.getItem("restauracja_token") ||
    localStorage.getItem("token");

  const isAdmin =
    currentUser?.role === "admin" &&
    String(currentUser?.email || "").toLowerCase() === "admin@admin.com";

  const alreadyRated = Boolean(
    currentUser &&
      reviews.some(
        (rev) =>
          (currentUser.id && Number(rev.user_id) === Number(currentUser.id)) ||
          (currentUser.email &&
            String(rev.user_email || "").toLowerCase() ===
              String(currentUser.email).toLowerCase())
      )
  );

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/api/dishes/${dishId}/reviews`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Nie udało się pobrać opinii.");
      }

      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setReviewsCount(data.reviewsCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dishId]);

  useEffect(() => {
    if (dishId) {
      fetchReviews();
    }
  }, [dishId, fetchReviews]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!token) {
      setError("Musisz być zalogowany, aby dodać opinię.");
      return;
    }

    if (alreadyRated) {
      setError("Możesz ocenić to danie tylko jeden raz.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/api/dishes/${dishId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: Number(rating),
          comment: comment.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się zapisać opinii.");
      }

      setSuccessMsg(data.message || "Dziękujemy za wystawienie oceny!");
      setComment("");
      setRating(5);
      await fetchReviews();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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

      await fetchReviews();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="dish-reviews">
      <div className="dish-reviews__summary">
        <h4>Opinie klientów ({reviewsCount})</h4>
        <p>
          Średnia ocena:{" "}
          <strong>
            {reviewsCount > 0 ? `${averageRating} / 5 ★` : "Brak ocen"}
          </strong>
        </p>
      </div>

      {token ? (
        alreadyRated ? (
          <p className="dish-reviews__already-rated">
            Już oceniłeś to danie — każdemu użytkownikowi przysługuje jedna ocena na danie.
          </p>
        ) : (
          <form onSubmit={handleAddReview} className="dish-reviews__form">
            <div className="dish-reviews__stars">
              <span>Twoja ocena: </span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Ocena ${star} na 5`}
                  style={{
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    fontSize: "1.3rem",
                    color: star <= rating ? "#c5a059" : "#999",
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              placeholder="Opcjonalny komentarz do potrawy..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <button type="submit" disabled={submitting}>
              {submitting ? "Zapisywanie..." : "Ocenić"}
            </button>
          </form>
        )
      ) : (
        <p className="dish-reviews__login-info">
          Zaloguj się na swoje konto, aby ocenić to danie.
        </p>
      )}

      {error && <p className="dish-reviews__error">{error}</p>}
      {successMsg && <p className="dish-reviews__success">{successMsg}</p>}

      {loading ? (
        <p>Ładowanie opinii...</p>
      ) : reviews.length === 0 ? (
        <p>To danie nie ma jeszcze żadnych opinii. Bądź pierwszy!</p>
      ) : (
        <ul className="dish-reviews__list">
          {reviews.map((rev) => (
            <li key={rev.id} className="dish-reviews__item">
              <div>
                <strong>{rev.user_name}</strong> ({rev.user_email}) —{" "}
                <span>
                  {"★".repeat(rev.rating)}
                  {"☆".repeat(5 - rev.rating)}
                </span>
              </div>
              <small>
                {new Date(rev.created_at).toLocaleString("pl-PL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </small>
              {rev.comment && <p>{rev.comment}</p>}

              {isAdmin && (
                <button
                  type="button"
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
  );
}