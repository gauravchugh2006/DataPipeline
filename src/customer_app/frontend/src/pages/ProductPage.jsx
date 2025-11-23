import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import ProductDetail from "../components/ProductDetail.jsx";
import ReviewList from "../components/ReviewList.jsx";
import { useProductDetail, useProductReviews } from "../hooks/useProducts.js";

const ProductPage = () => {
  const { productId } = useParams();
  const [offset, setOffset] = useState(0);
  const [pages, setPages] = useState([]);
  const { data: product, isLoading } = useProductDetail(productId);
  const { data: reviews = [], isFetching } = useProductReviews(productId, {
    limit: 10,
    offset,
  });

  useEffect(() => {
    setOffset(0);
    setPages([]);
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    setPages((prev) => {
      const exists = prev.some((page) => page.offset === offset);
      if (exists) {
        return prev;
      }
      return [...prev, { offset, data: reviews }];
    });
  }, [reviews, offset, productId]);

  const mergedReviews = useMemo(
    () => pages.slice().sort((a, b) => a.offset - b.offset).flatMap((page) => page.data),
    [pages]
  );
  const hasMore = reviews.length === 10;

  const fetchMore = useCallback(() => {
    if (hasMore) {
      setOffset((prev) => prev + 10);
    }
  }, [hasMore]);

  if (isLoading || !product) {
    return (
      <section className="container mx-auto px-6 py-16">
        <div className="h-96 bg-white/60 rounded-3xl animate-pulse" />
      </section>
    );
  }

  return (
    <section className="container mx-auto px-6 py-16 space-y-12">
      <ProductDetail product={product} />
      <ReviewList
        reviews={mergedReviews}
        fetchMore={fetchMore}
        hasMore={hasMore}
        isFetching={isFetching}
      />
    </section>
  );
};

export default ProductPage;
