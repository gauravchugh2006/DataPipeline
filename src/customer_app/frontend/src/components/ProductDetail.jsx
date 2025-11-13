import React, { useMemo, useState } from "react";
import { FaStar } from "react-icons/fa";

import { useCart } from "../context/CartContext.jsx";

const ProductDetail = ({ product }) => {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      price: Number(product.price),
      quantity,
      imageUrl: product.imageUrl,
    });
  };

  const total = useMemo(() => Number(product.price) * quantity, [product.price, quantity]);

  const image = product.imageUrl || "https://via.placeholder.com/400x400?text=Product";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr,1fr]">
      <div className="rounded-3xl bg-white shadow-inner border border-cafe-primary/10 overflow-hidden">
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-cafe-accent">
          <FaStar />
          <span className="font-semibold">{Number(product.averageRating || 4.7).toFixed(1)}</span>
          <span className="text-xs uppercase tracking-wide text-cafe-primary/60">
            {product.reviewCount || 24} verified reviews
          </span>
        </div>
        <h1 className="text-4xl font-semibold">{product.name}</h1>
        <p className="text-cafe-primary/70">{product.category}</p>
        <p className="text-lg leading-relaxed text-cafe-primary/80">
          A curated selection from our catalogue. Add it to your cart to include in a personalised order.
        </p>
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase text-cafe-primary/60">Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
            className="w-32 rounded-2xl border border-cafe-primary/10 px-4 py-3"
          />
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm uppercase text-cafe-primary/60">Total</p>
            <p className="text-2xl font-semibold">€{total.toFixed(2)}</p>
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
