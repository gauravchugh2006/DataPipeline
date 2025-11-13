import React from "react";
import { Link } from "react-router-dom";
import { FaStar } from "react-icons/fa";

const ProductCard = ({ product }) => {
  const cheapest = product.variants.reduce(
    (prev, variant) => (variant.price < prev ? variant.price : prev),
    product.variants[0]?.price || 0
  );

  return (
    <article className="bg-white rounded-3xl overflow-hidden card-shadow border border-cafe-primary/5">
      <div className="h-48 bg-gradient-to-br from-cafe-primary/20 to-cafe-accent/10" />
      <div className="p-6 space-y-3">
        <h3 className="text-xl font-semibold">{product.name}</h3>
        <p className="text-sm text-cafe-primary/70">{product.category}</p>
        <p className="text-sm text-cafe-primary/80 h-16 overflow-hidden">{product.description}</p>
        <div className="flex items-center gap-2 text-cafe-accent">
          <FaStar />
          <span className="font-semibold">{Number(product.rating || 4.6).toFixed(1)}</span>
          <span className="text-xs uppercase tracking-wide text-cafe-primary/60">
            ({product.review_count || product.variants.length * 3} reviews)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Starting €{Number(cheapest).toFixed(2)}</span>
          <Link
            to={`/products/${product.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-cafe-primary text-white px-4 py-2 text-sm"
          >
            View details →
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
