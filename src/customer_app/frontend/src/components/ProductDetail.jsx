import React, { useState } from "react";
import { FaStar } from "react-icons/fa";

import { useCart } from "../context/CartContext.jsx";

const ProductDetail = ({ product }) => {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const selectedVariant = product.variants.find((variant) => variant.id === Number(variantId));

  const handleAdd = () => {
    if (!selectedVariant) return;
    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      color: selectedVariant.color,
      size: selectedVariant.size,
      price: Number(selectedVariant.price),
      quantity,
    });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr,1fr]">
      <div className="bg-gradient-to-br from-cafe-primary/10 to-cafe-accent/10 rounded-3xl h-96" />
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-cafe-accent">
          <FaStar />
          <span className="font-semibold">{Number(product.rating || 4.7).toFixed(1)}</span>
          <span className="text-xs uppercase tracking-wide text-cafe-primary/60">
            {product.review_count || 24} verified reviews
          </span>
        </div>
        <h1 className="text-4xl font-semibold">{product.name}</h1>
        <p className="text-cafe-primary/70">{product.category}</p>
        <p className="text-lg leading-relaxed text-cafe-primary/80">{product.description}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase text-cafe-primary/60">Select variant</label>
            <select
              className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
            >
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.color} / {variant.size} — €{Number(variant.price).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase text-cafe-primary/60">Quantity</label>
            <input
              type="number"
              min={1}
              max={selectedVariant?.inventory || 5}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm uppercase text-cafe-primary/60">Total</p>
            <p className="text-2xl font-semibold">
              €{Number((selectedVariant?.price || 0) * quantity).toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="rounded-full bg-cafe-primary text-white px-8 py-3 font-semibold shadow-lg shadow-cafe-primary/20"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
