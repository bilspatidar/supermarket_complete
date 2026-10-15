
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Star,
  Send,
  MessageSquare,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  PenLine,
  X,
} from 'lucide-react';
import client from '../../api/client.js';

function StarRating({
  value = 0,
  onChange,
  size = 20,
  interactive = false,
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            size={size}
            className={
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300'
            }
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

function getPayload(response) {
  if (response?.success !== undefined) return response;
  if (response?.data?.success !== undefined) return response.data;
  return response?.data ?? response;
}

export default function ReviewSection({
  productId = null,
  isLoggedIn = false,
  showstyle = 'all',
  showLimit = 0,
  onLoginRequired,
  title = 'Customer Reviews',
}) {


  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const isSlide = String(showstyle).toLowerCase() === 'slide';
  const numericLimit = Math.max(0, Number(showLimit) || 0);

  const visibleReviews = useMemo(() => {
    return numericLimit > 0
      ? reviews.slice(0, numericLimit)
      : reviews;
  }, [reviews, numericLimit]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params =
        productId !== null && productId !== undefined && productId !== ''
          ? { product_id: productId }
          : {};

      const response = await client.get('/reviews', { params });
      const result = getPayload(response);

      if (result?.success === false) {
        throw new Error(result.message || 'Unable to load reviews.');
      }

      setReviews(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to load reviews.'
      );
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setSlideIndex(0);
  }, [visibleReviews.length, isSlide]);

  const averageRating = reviews.length
    ? reviews.reduce(
        (total, review) => total + Number(review.rating || 0),
        0
      ) / reviews.length
    : 0;

 function handleReviewNow() {
  setError('');
  setMessage('');

  if (!isLoggedIn) {
    if (onLoginRequired) {
      onLoginRequired();
    } else {
      // Replace /login if your project uses a different login URL.
      window.location.href = '/login';
    }

    return;
  }

  setShowForm(true);
}

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!isLoggedIn) {
      handleReviewNow();
      return;
    }

    if (rating < 1 || rating > 5) {
      setError('Please select a rating.');
      return;
    }

    if (reviewText.trim().length < 10) {
      setError('Please write at least 10 characters in your review.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        rating,
        review_title: reviewTitle.trim(),
        review_text: reviewText.trim(),
        ...(productId !== null &&
        productId !== undefined &&
        productId !== ''
          ? { product_id: productId }
          : {}),
      };

      const response = await client.post('/reviews', payload);
      const result = getPayload(response);

      if (result?.success === false) {
        throw new Error(result.message || 'Unable to submit your review.');
      }

      setRating(5);
      setReviewTitle('');
      setReviewText('');
      setShowForm(false);
      setMessage(
        result?.message ||
          'Thank you! Your review has been submitted for approval.'
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to submit your review.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function previousSlide() {
    setSlideIndex((current) =>
      current <= 0 ? visibleReviews.length - 1 : current - 1
    );
  }

  function nextSlide() {
    setSlideIndex((current) =>
      current >= visibleReviews.length - 1 ? 0 : current + 1
    );
  }

  function renderReview(review) {
    return (
      <article
        key={review.id}
        className="h-full rounded-xl border bg-white p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">
              {review.customer_name || 'Customer'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {formatDate(review.created_at)}
            </p>
          </div>

          <StarRating value={Number(review.rating)} />
        </div>

        {review.review_title && (
          <h4 className="mt-3 font-semibold text-gray-800">
            {review.review_title}
          </h4>
        )}

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
          {review.review_text}
        </p>
      </article>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Genuine feedback from our customers
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </span>
            <div>
              <StarRating value={Math.round(averageRating)} />
              <p className="mt-1 text-sm text-gray-500">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleReviewNow}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          <PenLine size={18} />
          Review Now
        </button>

        {showForm && (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-gray-700 hover:bg-gray-50"
          >
            <X size={18} />
            Cancel
          </button>
        )}
      </div>

      {showForm && isLoggedIn && (
        <div className="rounded-2xl border bg-white p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <MessageSquare size={20} />
            Write a Review
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Your Rating
              </label>
              <StarRating
                value={rating}
                onChange={setRating}
                size={30}
                interactive
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Review Title (optional)
              </label>
              <input
                type="text"
                value={reviewTitle}
                onChange={(event) => setReviewTitle(event.target.value)}
                maxLength={150}
                placeholder="Summarize your experience"
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Your Review
              </label>
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                minLength={10}
                maxLength={3000}
                required
                rows={4}
                placeholder="Share your experience with us..."
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {reviewText.length}/3000
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {message}
        </p>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">What Customers Say</h3>
          <span className="text-sm text-gray-500">
            {visibleReviews.length} {visibleReviews.length === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Loading reviews...
          </p>
        ) : visibleReviews.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <MessageSquare
              className="mx-auto mb-3 text-gray-400"
              size={32}
            />
            <p className="font-medium text-gray-700">No reviews yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Be the first to share your experience.
            </p>
          </div>
        ) : isSlide ? (
          <div className="space-y-3">
            <div className="min-w-0">
              {renderReview(visibleReviews[slideIndex])}
            </div>

            {visibleReviews.length > 1 && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={previousSlide}
                  aria-label="Previous review"
                  className="inline-flex items-center gap-1 rounded-lg px-4 py-2 hover:bg-gray-50"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                <span className="text-sm text-gray-500">
                  {slideIndex + 1} / {visibleReviews.length}
                </span>

                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next review"
                  className="inline-flex items-center gap-1 rounded-lg px-4 py-2 hover:bg-gray-50"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleReviews.map(renderReview)}
          </div>
        )}
      </div>
    </section>
  );
}
