import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaCartPlus, FaHeart, FaTimes } from "react-icons/fa";

import { useCart } from "../../context/CartContext.jsx";

const CartDrawer = ({ open, onClose }) => {
  const {
    items,
    wishlist,
    subtotal,
    removeItem,
    clearCart,
    updateQuantity,
    moveToWishlist,
    moveWishlistItemToCart,
    removeWishlistItem,
    loading,
  } = useCart();
  const [draftQuantities, setDraftQuantities] = useState({});

  useEffect(() => {
    const nextDrafts = {};
    items.forEach((item) => {
      nextDrafts[item.productId] = item.quantity;
    });
    setDraftQuantities(nextDrafts);
  }, [items]);

  const handleDraftChange = (productId, value) => {
    const rawValue = value === "" ? "" : Math.max(Number(value) || 1, 1);
    setDraftQuantities((prev) => ({ ...prev, [productId]: rawValue }));
  };

  const commitDraft = (productId) => {
    const raw = draftQuantities[productId];
    const quantity = Math.max(Number(raw) || 1, 1);
    const current = items.find((item) => item.productId === productId);
    if (current && current.quantity === quantity) {
      return;
    }
    updateQuantity(productId, quantity);
  };

  const handleKeyDown = (event, productId) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft(productId);
    }
  };

  const adjustQuantity = (productId, nextQuantity) => {
    if (nextQuantity <= 0) {
      updateQuantity(productId, 0);
      return;
    }
    setDraftQuantities((prev) => ({ ...prev, [productId]: nextQuantity }));
    updateQuantity(productId, nextQuantity);
  };

  const disableCheckout = items.length === 0;

  return (
    <div
      className={`fixed inset-0 z-40 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl transform transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-semibold">Your cart</h2>
            <p className="text-xs uppercase tracking-wide text-cafe-primary/60">
              {items.length} items • €{subtotal.toFixed(2)}
            </p>
          </div>
          <button onClick={onClose} className="text-cafe-primary hover:text-cafe-accent">
            <FaTimes />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100%-260px)]">
          {loading && (
            <p className="text-xs uppercase tracking-wide text-cafe-primary/60">Syncing your bag…</p>
          )}
          {items.length === 0 && !loading && (
            <p className="text-cafe-primary/70">Your cart is empty. Explore our menu!</p>
          )}
          {items.map((item) => (
            <div key={item.productId} className="border rounded-lg p-4 flex flex-col gap-3 card-shadow">
              <div className="flex items-center gap-3">
                <img
                  src={item.imageUrl || "https://via.placeholder.com/64x64?text=%20"}
                  alt={item.productName}
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold leading-tight">{item.productName}</h3>
                      {item.category && (
                        <p className="text-xs uppercase tracking-wide text-cafe-primary/50">{item.category}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-xs uppercase tracking-wide text-cafe-primary/60 hover:text-cafe-accent"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-cafe-primary">€{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cafe-primary/20 px-3 py-1">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(item.productId, item.quantity - 1)}
                    className="text-cafe-primary text-lg leading-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={draftQuantities[item.productId] ?? item.quantity}
                    onChange={(event) => handleDraftChange(item.productId, event.target.value)}
                    onBlur={() => commitDraft(item.productId)}
                    onKeyDown={(event) => handleKeyDown(event, item.productId)}
                    className="w-16 border-none bg-transparent text-center text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustQuantity(item.productId, item.quantity + 1)}
                    className="text-cafe-primary text-lg leading-none"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => moveToWishlist(item.productId)}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-cafe-primary/70 hover:text-cafe-accent"
                >
                  <FaHeart /> Save for later
                </button>
              </div>
            </div>
          ))}
          {wishlist.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-semibold text-cafe-primary">Saved for later ({wishlist.length})</p>
              <div className="mt-3 space-y-3">
                {wishlist.map((item) => (
                  <div key={item.productId} className="rounded-xl border border-dashed border-cafe-primary/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-cafe-primary/60">€{Number(item.price).toFixed(2)}</p>
                      </div>
                      <div className="flex flex-col gap-1 text-xs">
                        <button
                          onClick={() => moveWishlistItemToCart(item.productId)}
                          className="inline-flex items-center gap-1 text-cafe-accent"
                        >
                          <FaCartPlus /> Move to cart
                        </button>
                        <button
                          onClick={() => removeWishlistItem(item.productId)}
                          className="text-cafe-primary/60 hover:text-cafe-accent"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-6 space-y-3 bg-white">
          <div className="flex items-center justify-between text-lg">
            <span>Total</span>
            <span className="font-semibold">€{subtotal.toFixed(2)}</span>
          </div>
          <Link
            to={disableCheckout ? "#" : "/checkout"}
            onClick={(event) => {
              if (disableCheckout) {
                event.preventDefault();
                return;
              }
              onClose?.();
            }}
            className={`w-full inline-flex items-center justify-center rounded-full bg-cafe-primary text-white py-3 font-semibold transition ${
              disableCheckout ? "opacity-50 pointer-events-none" : "hover:bg-cafe-primary/90"
            }`}
          >
            Go to checkout
          </Link>
          <button
            onClick={clearCart}
            disabled={items.length === 0 || loading}
            className="w-full rounded-full border border-cafe-primary/20 py-3 text-sm text-cafe-primary/80 disabled:opacity-40"
          >
            Clear cart
          </button>
        </div>
      </aside>
    </div>
  );
};

export default CartDrawer;
