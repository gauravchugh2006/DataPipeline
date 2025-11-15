import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FiPackage, FiUsers, FiShoppingCart } from "react-icons/fi";

import { useAuth } from "../../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "products", label: "Products", icon: <FiPackage /> },
  { to: "customers", label: "Customers", icon: <FiUsers /> },
  { to: "orders", label: "Orders", icon: <FiShoppingCart /> },
];

const AdminLayout = () => {
  const location = useLocation();
  const { profile } = useAuth();

  return (
    <section className="container mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-cafe-primary/60">Admin Console</p>
        <h1 className="text-3xl font-semibold text-cafe-primary">Operational Control Centre</h1>
        <p className="text-sm text-cafe-primary/70 max-w-2xl">
          Manage catalogue data, customer profiles, and transactional orders with inline updates and exportable
          insights. Signed in as <span className="font-medium">{profile?.email}</span>.
        </p>
      </header>

      <nav className="flex flex-wrap gap-3">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname.endsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive || active
                    ? "border-cafe-primary bg-cafe-primary text-white shadow-md"
                    : "border-cafe-primary/20 text-cafe-primary hover:border-cafe-primary/40 hover:bg-white"
                }`
              }
              end={false}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="bg-white rounded-3xl border border-cafe-primary/10 shadow-sm">
        <Outlet />
      </div>
    </section>
  );
};

export default AdminLayout;

