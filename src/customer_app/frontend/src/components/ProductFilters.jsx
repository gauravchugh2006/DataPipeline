import React from "react";

const categories = ["All", "Beverages", "Desserts", "Merch"];
const colors = ["Caramel", "Mocha", "Original", "Vanilla", "Classic", "Hazelnut"];
const sizes = ["Tall", "Grande", "Bottle", "Slice"];

const ProductFilters = ({ filters, onChange }) => {
  const update = (name, value) => {
    onChange({ ...filters, [name]: value, offset: 0 });
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl card-shadow p-6 md:p-8" id="menu">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Curate your cravings</h2>
          <p className="text-sm text-cafe-primary/70">Filter by category, palate, roast, and size.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => update("category", category === "All" ? "" : category)}
              className={`px-4 py-2 rounded-full border transition ${
                filters.category === category || (!filters.category && category === "All")
                  ? "bg-cafe-primary text-white border-cafe-primary"
                  : "border-cafe-primary/10 text-cafe-primary/70"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-4 gap-4 mt-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase text-cafe-primary/60">Color palette</label>
          <select
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            value={filters.color || ""}
            onChange={(event) => update("color", event.target.value || "")}
          >
            <option value="">Any roast</option>
            {colors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase text-cafe-primary/60">Size</label>
          <select
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            value={filters.size || ""}
            onChange={(event) => update("size", event.target.value || "")}
          >
            <option value="">Any size</option>
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase text-cafe-primary/60">Price range (€)</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice || ""}
              onChange={(event) => update("minPrice", event.target.value)}
              className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice || ""}
              onChange={(event) => update("maxPrice", event.target.value)}
              className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase text-cafe-primary/60">Sort</label>
          <select
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            value={filters.sort || "price_asc"}
            onChange={(event) => update("sort", event.target.value)}
          >
            <option value="price_asc">Price (Low to High)</option>
            <option value="price_desc">Price (High to Low)</option>
            <option value="newest">Newest arrivals</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProductFilters;
