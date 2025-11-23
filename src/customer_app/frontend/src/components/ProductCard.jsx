import React from "react";
import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  const image = product.imageUrl || "https://via.placeholder.com/200x200?text=Product";
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-cafe-primary/10 bg-white p-3 shadow-sm">
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden rounded-xl bg-cafe-primary/5">
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="space-y-1 text-sm">
        <p className="font-semibold text-cafe-primary/80 line-clamp-2">{product.name}</p>
        <p className="text-xs uppercase tracking-wide text-cafe-primary/50">{product.category}</p>
        <p className="text-base font-bold text-cafe-primary">€{Number(product.price).toFixed(2)}</p>
      </div>
    </article>
  );
};

export default ProductCard;
