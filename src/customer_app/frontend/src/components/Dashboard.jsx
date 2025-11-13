import React from "react";

import LoginForm from "./LoginForm.jsx";
import RegisterForm from "./RegisterForm.jsx";
import SupportForm from "./SupportForm.jsx";
import MapEmbed from "./MapEmbed.jsx";
import OrderHistory from "./OrderHistory.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const Dashboard = ({ orders }) => {
  const { user, personalizeTheme, theme } = useAuth();

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
      <div className="space-y-8">
        <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                {user ? `Bonjour ${user.name}!` : "Personalised cafe dashboard"}
              </h2>
              <p className="text-sm text-cafe-primary/70">
                {user
                  ? "Track live orders, manage invoices, and experiment with cafe themes."
                  : "Sign in or register to sync favourites, loyalty, and quick reorders."}
              </p>
            </div>
            <div className="flex gap-2">
              {["sunrise", "midnight", "matcha"].map((palette) => (
                <button
                  key={palette}
                  onClick={() => personalizeTheme(palette)}
                  className={`h-10 w-10 rounded-full border ${
                    theme === palette ? "border-cafe-accent" : "border-transparent"
                  }`}
                  style={{ background: palette === "midnight" ? "#1F1B24" : palette === "matcha" ? "#9AD7AE" : "#F7A76C" }}
                />
              ))}
            </div>
          </div>
          <div className="mt-6">
            <OrderHistory orders={orders} />
          </div>
        </div>
        <SupportForm />
        <MapEmbed />
      </div>
      <div className="space-y-6">
        {!user && <RegisterForm />}
        {!user && <LoginForm />}
        {user && (
          <div className="bg-white rounded-3xl p-6 card-shadow text-sm text-cafe-primary/70">
            <p>Logged in as {user.email}</p>
            <p className="mt-2">Role: {user.role}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
