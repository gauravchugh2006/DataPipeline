import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaTag } from "react-icons/fa";

import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiClient } from "../hooks/useProducts.js";
import { useNotifications } from "../context/NotificationContext.jsx";

const CheckoutPage = () => {
  const { items, wishlist, subtotal } = useCart();
  const { profile, authHeaders } = useAuth();
  const { notify } = useNotifications();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const discount = useMemo(() => {
    if (!appliedCoupon) {
      return 0;
    }
    if (appliedCoupon.discountType === "percent") {
      return Math.min(subtotal * (appliedCoupon.discountValue / 100), subtotal);
    }
    return Math.min(appliedCoupon.discountValue, subtotal);
  }, [appliedCoupon, subtotal]);

  const total = Math.max(subtotal - discount, 0);
  const cartEmpty = items.length === 0;

  const handleApplyCoupon = async (event) => {
    event.preventDefault();
    if (!couponCode.trim()) {
      return;
    }
    if (!profile) {
      notify({ title: "Sign in required", message: "Login to apply discount codes.", tone: "warning" });
      return;
    }
    setCouponLoading(true);
    try {
      const { data } = await apiClient.post(
        "/cart/coupons/validate",
        { code: couponCode.trim(), subtotal },
        authHeaders
      );
      setAppliedCoupon(data.coupon);
      notify({
        title: "Coupon applied",
        message: data.coupon.message || "Savings unlocked!",
        tone: "success",
      });
    } catch (error) {
      const message = error.response?.data?.error || "This coupon is not available right now.";
      notify({ title: "Coupon unavailable", message, tone: "error" });
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    notify({ title: "Coupon removed", message: "We cleared the savings code.", tone: "info" });
  };

  const handlePlaceOrder = () => {
    if (cartEmpty) {
      notify({ title: "Cart empty", message: "Add a few goodies before checking out.", tone: "warning" });
      return;
    }
    if (!profile) {
      notify({ title: "Almost there", message: "Create an account or login to finish checkout.", tone: "warning" });
      return;
    }
    notify({
      title: "Checkout ready",
      message: "Order orchestration hooks into the OMS in the next sprint.",
      tone: "success",
    });
  };

  return (
    <section className="container mx-auto px-6 py-16 space-y-10">
      <div className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-cafe-primary/50">Checkout</p>
        <h1 className="text-4xl font-semibold">Review your curated cart</h1>
        <p className="text-cafe-primary/70">Edit quantities, apply a savings code and wrap things up with confidence.</p>
      </div>
      {!profile && (
        <div className="rounded-3xl border border-cafe-primary/10 bg-white/80 px-6 py-4 text-sm text-cafe-primary/80">
          <p className="font-semibold">Pro tip</p>
          <p>Login to sync your cart and unlock loyalty coupons across every device.</p>
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {cartEmpty ? (
            <div className="rounded-3xl border border-dashed border-cafe-primary/30 bg-white/60 p-8 text-center text-cafe-primary/70">
              <p>Your cart is waiting for its first treat.</p>
              <Link to="/" className="mt-3 inline-flex items-center justify-center rounded-full bg-cafe-primary px-6 py-2 text-white">
                Continue shopping
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-6 card-shadow space-y-4">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 border-b border-cafe-primary/10 pb-4 last:border-none last:pb-0">
                  <img
                    src={item.imageUrl || "https://via.placeholder.com/64x64?text=%20"}
                    alt={item.productName}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{item.productName}</p>
                    <p className="text-xs uppercase tracking-wide text-cafe-primary/50">Qty {item.quantity}</p>
                  </div>
                  <p className="font-semibold">€{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
          {wishlist.length > 0 && (
            <div className="rounded-3xl border border-cafe-primary/10 bg-white/60 p-6 space-y-3">
              <p className="text-sm font-semibold text-cafe-primary">Saved for later ({wishlist.length})</p>
              {wishlist.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-sm text-cafe-primary/80">
                  <span>{item.productName}</span>
                  <span>€{Number(item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="rounded-3xl bg-white p-6 card-shadow space-y-4">
          <form onSubmit={handleApplyCoupon} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-cafe-primary/60">
              Discount code
            </label>
            <div className="flex gap-2">
              <div className="flex-1 rounded-2xl border border-cafe-primary/20 px-4 py-2 flex items-center gap-2">
                <FaTag className="text-cafe-accent" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="E.g. WELCOME10"
                  className="flex-1 bg-transparent focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={couponLoading}
                className="rounded-2xl bg-cafe-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {couponLoading ? "Applying…" : "Apply"}
              </button>
            </div>
          </form>
          {appliedCoupon && (
            <div className="rounded-2xl bg-cafe-primary/5 px-4 py-3 text-sm text-cafe-primary">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{appliedCoupon.code}</p>
                  <p className="text-xs text-cafe-primary/60">{appliedCoupon.description}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs uppercase tracking-wide text-cafe-primary/70"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
          <div className="space-y-2 text-sm text-cafe-primary/80">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span className="text-cafe-accent">−€{discount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-semibold text-cafe-primary">
              <span>Total due</span>
              <span>€{total.toFixed(2)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={cartEmpty}
            className="w-full rounded-full bg-cafe-primary py-3 text-white font-semibold disabled:opacity-40"
          >
            Place order
          </button>
          <p className="text-xs text-cafe-primary/60 text-center">
            Payment orchestration is simulated for now—orders sync with the OMS in the next iteration.
          </p>
        </aside>
      </div>
    </section>
  );
};

export default CheckoutPage;
