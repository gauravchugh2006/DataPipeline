import React from "react";

const categories = [
  { value: "", label: "All products" },
  { value: "Electronics", label: "Electronics" },
  { value: "Apparel", label: "Apparel" },
  { value: "Home Goods", label: "Home Goods" },
  { value: "Books", label: "Books" },
  { value: "Sports", label: "Sports" },
];

const sortOptions = [
  { value: "name", label: "Name (A-Z)" },
  { value: "price_asc", label: "Price (Low to High)" },
  { value: "price_desc", label: "Price (High to Low)" },
  { value: "newest", label: "Newest first" },
  { value: "popular", label: "Most popular" },
];

const ProductFilters = ({ filters, onChange, onReset }) => {
  const update = (name, value) => {
    onChange({ ...filters, [name]: value, page: 1 });
  };

  return (
    <aside className="space-y-6 bg-white rounded-3xl p-6 card-shadow border border-cafe-primary/10">
      <div>
        <h3 className="text-lg font-semibold">Filter catalogue</h3>
        <p className="text-xs text-cafe-primary/60">Narrow by category, pricing, or search keywords.</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase text-cafe-primary/60">Search</label>
        <input
          type="search"
          value={filters.search || ""}
          onChange={(event) => update("search", event.target.value)}
          className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          placeholder="Laptop, apparel, blender…"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase text-cafe-primary/60">Category</label>
        <div className="flex flex-col gap-2 text-sm">
          {categories.map((category) => (
            <label key={category.value} className="inline-flex items-center gap-2">
              <input
                type="radio"
                className="text-cafe-primary"
                checked={(filters.category || "") === category.value}
                onChange={() => update("category", category.value)}
              />
              <span>{category.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase text-cafe-primary/60">Price range (€)</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice ?? ""}
            onChange={(event) => update("minPrice", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice ?? ""}
            onChange={(event) => update("maxPrice", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase text-cafe-primary/60">Sort by</label>
        <select
          className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          value={filters.sort || "name"}
          onChange={(event) => update("sort", event.target.value)}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => onReset && onReset()}
        className="w-full rounded-full border border-cafe-primary/20 py-2 text-sm text-cafe-primary/80"
      >
        Reset filters
      </button>
    </aside>
  );
};

export default ProductFilters;
