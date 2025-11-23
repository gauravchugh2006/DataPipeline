import React from "react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="gradient-hero text-white">
      <div className="container mx-auto px-6 py-24 grid gap-10 lg:grid-cols-2 items-center">
        <div className="space-y-6">
          <p className="uppercase tracking-[0.35em] text-sm text-white/70">Crafted daily</p>
          <h1 className="text-5xl md:text-6xl font-semibold leading-tight">
            Elevate your cafe experience with digital-first ordering
          </h1>
          <p className="text-lg md:text-xl text-white/80">
            Discover premium beverages, curated desserts, and lifestyle merchandise. Manage
            personalised themes, track delivery, download invoices, and stay in sync with our baristas.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/dashboard"
              className="rounded-full bg-white text-cafe-primary px-6 py-3 font-semibold shadow-lg"
            >
              Start your order
            </Link>
            <a
              href="#menu"
              className="rounded-full border border-white/40 px-6 py-3 font-semibold text-white/90"
            >
              Explore menu highlights
            </a>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-3xl p-8 space-y-6">
          <h2 className="text-2xl font-semibold">Live brewing insights</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Signature beverages", value: "18" },
              { label: "Seasonal specials", value: "6" },
              { label: "Orders prepared", value: "1,247" },
              { label: "Active baristas", value: "12" },
            ].map((metric) => (
              <div key={metric.label} className="bg-white/10 rounded-2xl p-4 text-center">
                <p className="text-sm uppercase tracking-wide text-white/70">{metric.label}</p>
                <p className="text-3xl font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
