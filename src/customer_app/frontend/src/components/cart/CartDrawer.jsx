import React from "react";
import { FaTimes } from "react-icons/fa";

import { useCart } from "../../context/CartContext.jsx";

const CartDrawer = ({ open, onClose }) => {
  const { items, subtotal, removeItem, clear } = useCart();

  return (
    <div
      className={`fixed inset-0 z-40 transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl transform transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold">Your cart</h2>
          <button onClick={onClose} className="text-cafe-primary hover:text-cafe-accent">
            <FaTimes />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100%-200px)]">
          {items.length === 0 && <p className="text-cafe-primary/70">Your cart is empty. Explore our menu!</p>}
          {items.map((item) => (
            <div key={item.variantId} className="border rounded-lg p-4 flex flex-col gap-2 card-shadow">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{item.productName}</h3>
                <button
                  onClick={() => removeItem(item.variantId)}
                  className="text-xs uppercase tracking-wide text-cafe-primary/70 hover:text-cafe-accent"
                >
                  remove
                </button>
              </div>
              <p className="text-sm text-cafe-primary/80">
                {item.color} • {item.size}
              </p>
              <p className="font-semibold">€{(item.price * item.quantity).toFixed(2)}</p>
              <p className="text-xs text-cafe-primary/60">Qty: {item.quantity}</p>
            </div>
          ))}
        </div>
        <div className="border-t p-6 space-y-3">
          <div className="flex items-center justify-between text-lg">
            <span>Total</span>
            <span className="font-semibold">€{subtotal.toFixed(2)}</span>
          </div>
          <button className="w-full rounded-full bg-cafe-primary text-white py-3 font-semibold">
            Checkout (coming soon)
          </button>
          <button
            onClick={clear}
            className="w-full rounded-full border border-cafe-primary/20 py-3 text-sm text-cafe-primary/80"
          >
            Clear cart
          </button>
        </div>
      </aside>
    </div>
  );
};

export default CartDrawer;
