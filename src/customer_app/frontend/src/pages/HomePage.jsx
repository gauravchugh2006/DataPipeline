import React, { useState } from "react";

import Hero from "../components/Hero.jsx";
import ProductFilters from "../components/ProductFilters.jsx";
import ProductGrid from "../components/ProductGrid.jsx";
import { useProducts } from "../hooks/useProducts.js";

const HomePage = () => {
  const [filters, setFilters] = useState({ page: 1, pageSize: 25, sort: "name" });
  const { data, isLoading } = useProducts(filters);

  const resetFilters = () => setFilters({ page: 1, pageSize: 25, sort: "name" });

  const handleFilterChange = (next) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div>
      <Hero />
      <section className="container mx-auto px-6 py-16">
        <div className="grid gap-8 xl:grid-cols-[280px,1fr]">
          <ProductFilters filters={filters} onChange={handleFilterChange} onReset={resetFilters} />
          <div className="bg-white rounded-3xl p-6 card-shadow space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">Browse the collection</h2>
              <p className="text-sm text-cafe-primary/70">
                Scroll through 25 curated products per page with quick filters on the side.
              </p>
            </div>
            <ProductGrid data={data} isLoading={isLoading} onPageChange={handlePageChange} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
