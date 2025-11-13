import React, { useMemo, useState } from "react";

import Hero from "../components/Hero.jsx";
import ProductFilters from "../components/ProductFilters.jsx";
import FilterPills from "../components/FilterPills.jsx";
import ProductGrid from "../components/ProductGrid.jsx";
import { useProducts } from "../hooks/useProducts.js";

const HomePage = () => {
  const [filters, setFilters] = useState({ limit: 9, offset: 0 });
  const { data = [], isLoading } = useProducts(filters);

  const clearFilter = (key) => {
    if (key === "all") {
      setFilters({ limit: 9, offset: 0 });
    } else {
      setFilters((prev) => ({ ...prev, [key]: "", offset: 0 }));
    }
  };

  const nextFilters = useMemo(
    () => ({ ...filters, offset: Number(filters.offset || 0) }),
    [filters]
  );

  return (
    <div>
      <Hero />
      <section className="container mx-auto px-6 py-16 space-y-8">
        <ProductFilters filters={nextFilters} onChange={setFilters} />
        <FilterPills filters={nextFilters} onClear={clearFilter} />
        <ProductGrid products={data} isLoading={isLoading} />
      </section>
    </div>
  );
};

export default HomePage;
