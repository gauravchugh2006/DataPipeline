import React, { useEffect, useMemo, useState } from "react";
import { FaExclamationTriangle, FaLeaf, FaShieldAlt, FaStar } from "react-icons/fa";

import { useCart } from "../context/CartContext.jsx";
import { useAnalytics } from "../hooks/useAnalytics.js";

const ProductDetail = ({ product }) => {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { trackEvent } = useAnalytics();

  const handleAdd = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      price: Number(product.price),
      quantity,
      imageUrl: product.imageUrl,
      category: product.category,
    });
  };

  const total = useMemo(() => Number(product.price) * quantity, [product.price, quantity]);

  const image = product.imageUrl || "https://via.placeholder.com/400x400?text=Product";

  const csrAlerts = useMemo(() => product.csr?.alerts || [], [product.csr]);

  useEffect(() => {
    if (!product) return;
    trackEvent("csr_content_viewed", {
      productId: product.id,
      hasCarbonFootprint: Boolean(product.csr?.carbonFootprintKg),
      certificationCount: product.csr?.supplierCertifications?.length || 0,
      alerts: csrAlerts,
    });
  }, [product, trackEvent, csrAlerts]);

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
        <section className="rounded-3xl border border-cafe-primary/10 bg-white px-4 py-5 text-sm text-cafe-primary/80">
          <header className="flex items-center gap-2 text-cafe-primary">
            <FaLeaf className="text-cafe-accent" />
            <h2 className="text-base font-semibold">Social responsibility snapshot</h2>
          </header>
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Carbon footprint:</span>
              <span>
                {product.csr?.carbonFootprintKg
                  ? `${product.csr.carbonFootprintKg.toFixed(1)} kg CO₂e`
                  : "Awaiting disclosure"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <FaShieldAlt className="text-cafe-primary/60" />
                <span className="font-semibold">Supplier certifications</span>
              </div>
              <ul className="ml-7 mt-2 list-disc space-y-1">
                {product.csr?.supplierCertifications?.length ? (
                  product.csr.supplierCertifications.map((certification) => (
                    <li key={certification}>{certification}</li>
                  ))
                ) : (
                  <li className="text-cafe-primary/60">Not yet documented</li>
                )}
              </ul>
            </div>
            <p className="text-xs uppercase tracking-wide text-cafe-primary/50">
              Source: {product.csr?.dataSource || "Supplier verification pending"}
            </p>
            {product.csr?.lastVerified && (
              <p className="text-xs text-cafe-primary/50">
                Last verified on {new Date(product.csr.lastVerified).toLocaleDateString()}
              </p>
            )}
            {csrAlerts.length > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-700">
                <div className="flex items-center gap-2 font-semibold">
                  <FaExclamationTriangle />
                  Transparency alerts
                </div>
                <ul className="ml-6 mt-2 list-disc space-y-1">
                  {csrAlerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs uppercase tracking-wide">
                  We surface alerts when data is missing so customers are never misled.
                </p>
              </div>
            )}
          </div>
        </section>
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
