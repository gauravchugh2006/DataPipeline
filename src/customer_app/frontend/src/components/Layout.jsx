import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FaCoffee, FaShoppingBag, FaSun, FaMoon } from "react-icons/fa";

import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import CartDrawer from "./cart/CartDrawer.jsx";

const Layout = ({ children }) => {
  const { profile, logout, personalizeTheme, theme } = useAuth();
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);

  const toggleTheme = () => {
    personalizeTheme(theme === "sunrise" ? "midnight" : "sunrise");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/90 backdrop-blur border-b border-cafe-primary/10 sticky top-0 z-30">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-2xl font-semibold">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cafe-primary text-white">
              <FaCoffee />
            </span>
            Cafe Commerce
          </Link>
          <nav className="flex items-center gap-6 text-sm uppercase tracking-wide">
            <NavLink to="/" className={({ isActive }) => (isActive ? "text-cafe-accent" : "hover:text-cafe-accent")}>Home</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "text-cafe-accent" : "hover:text-cafe-accent")}>Dashboard</NavLink>
            <NavLink to="/checkout" className={({ isActive }) => (isActive ? "text-cafe-accent" : "hover:text-cafe-accent")}>Checkout</NavLink>
            {profile?.role === "admin" && (
              <NavLink to="/admin" className={({ isActive }) => (isActive ? "text-cafe-accent" : "hover:text-cafe-accent")}>Admin</NavLink>
            )}
            <button
              onClick={() => setOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-full bg-cafe-primary text-white px-4 py-2 shadow-lg shadow-cafe-primary/20"
            >
              <FaShoppingBag />
              <span>Cart</span>
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-cafe-accent text-xs font-bold text-white flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-cafe-primary/20 text-cafe-primary hover:bg-cafe-primary hover:text-white transition"
            >
              {theme === "sunrise" ? <FaSun /> : <FaMoon />}
            </button>
            {profile ? (
              <button
                onClick={logout}
                className="text-sm text-cafe-primary underline decoration-cafe-accent decoration-2"
              >
                Logout
              </button>
            ) : (
              <span className="text-sm text-cafe-primary/70">Guest</span>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-cafe-primary text-white py-10 mt-16">
        <div className="container mx-auto px-6 grid gap-6 md:grid-cols-3">
          <div>
            <h3 className="font-semibold mb-2 text-lg">Cafe Commerce HQ</h3>
            <p>10 Rue Gaston Levy, Sevran-Livry, France 93270</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-lg">Support</h3>
            <p>Email: support@cafecoffeeday.com</p>
            <p>Phone: +33 1 23 45 67 89</p>
          </div>
          <div className="text-sm text-cafe-cream/80">
            Crafted with ❤️ for modern coffee lovers. Fully responsive and PWA ready.
          </div>
        </div>
      </footer>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default Layout;
