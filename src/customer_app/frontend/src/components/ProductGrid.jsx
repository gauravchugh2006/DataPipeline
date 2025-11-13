import React from "react";

import ProductCard from "./ProductCard.jsx";

const ProductGrid = ({ data, isLoading, onPageChange }) => {
  const products = data?.items || [];
  const page = data?.page || 1;
  const totalPages = data?.totalPages || 1;
  const pageSize = data?.pageSize || 25;
  const total = data?.total || products.length;
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = total === 0 ? 0 : (page - 1) * pageSize + products.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {isLoading
          ? [...Array(25)].map((_, index) => (
              <div key={index} className="aspect-square rounded-2xl bg-white/60 animate-pulse" />
            ))
          : products.length > 0
          ? products.map((product) => <ProductCard key={product.id} product={product} />)
          : (
              <p className="col-span-full text-center text-cafe-primary/60">
                No products match your filters yet.
              </p>
            )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-cafe-primary/80">
        <span>
          {isLoading ? "Loading products…" : `Showing ${startIndex}-${endIndex} of ${total} products`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            disabled={page === 1 || isLoading}
            className="rounded-full border border-cafe-primary/20 px-4 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
            disabled={page === totalPages || isLoading}
            className="rounded-full border border-cafe-primary/20 px-4 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductGrid;
