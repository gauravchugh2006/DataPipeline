import React, { useEffect, useRef } from "react";

const ReviewList = ({ reviews, fetchMore, hasMore, isFetching }) => {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          fetchMore();
        }
      },
      { threshold: 1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchMore, hasMore, isFetching]);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Customer moments</h2>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {reviews.map((review) => (
          <article key={review.id} className="bg-white rounded-2xl border border-cafe-primary/10 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{review.customer_name}</p>
              <span className="text-cafe-accent font-semibold">{"⭐".repeat(review.rating)}</span>
            </div>
            <p className="text-sm text-cafe-primary/70 mt-1">{new Date(review.created_at).toLocaleString()}</p>
            <p className="mt-2 text-cafe-primary/80 leading-relaxed">{review.comment}</p>
          </article>
        ))}
        <div ref={sentinelRef} />
        {isFetching && <p className="text-sm text-center text-cafe-primary/60">Loading more stories…</p>}
        {!hasMore && (
          <p className="text-sm text-center text-cafe-primary/60">You are all caught up!</p>
        )}
      </div>
    </section>
  );
};

export default ReviewList;
