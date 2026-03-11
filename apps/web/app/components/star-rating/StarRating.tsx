export function StarRating({ avg, count }: { avg: number; count: number }) {
  const stars = [1, 2, 3, 4, 5];
  // Unique enough ID based on avg+count (no Math.random – safe for SSR)
  const uid = `sr-${Math.round(avg * 100)}-${count}`;

  return (
    <div className="star-rating">
      <span className="star-rating__score">{avg.toFixed(2)}</span>
      <div className="star-rating__stars" aria-label={`Ocena ${avg.toFixed(2)} na 5`}>
        {stars.map((star) => {
          const fill = Math.min(1, Math.max(0, avg - (star - 1)));
          const pct = Math.round(fill * 100);
          const clipId = `${uid}-s${star}`;
          return (
            <svg
              key={star}
              className="star-rating__star"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect x="0" y="0" width={pct / 5} height="20" />
                </clipPath>
              </defs>
              <path
                d="M10 1l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 13.27l-4.78 2.51.91-5.32L2.27 6.62l5.34-.78z"
                className="star-rating__star-bg"
              />
              <path
                d="M10 1l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 13.27l-4.78 2.51.91-5.32L2.27 6.62l5.34-.78z"
                className="star-rating__star-fill"
                clipPath={`url(#${clipId})`}
              />
            </svg>
          );
        })}
      </div>
      <span className="star-rating__count">
        ({count} {count === 1 ? 'ocena' : count < 5 ? 'oceny' : 'ocen'})
      </span>
    </div>
  );
}
