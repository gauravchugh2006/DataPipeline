import React from "react";

import ProductCard from "./ProductCard.jsx";

const ProductGrid = ({ products, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="h-72 bg-white/60 animate-pulse rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return <p className="text-center text-cafe-primary/70">No items match your filters yet.</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
