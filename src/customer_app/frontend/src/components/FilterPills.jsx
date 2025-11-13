import React from "react";

const labels = {
  category: "Category",
  color: "Color",
  size: "Size",
};

const FilterPills = ({ filters, onClear }) => {
  const activeEntries = Object.entries(filters).filter(
    ([key, value]) => ["category", "color", "size", "search"].includes(key) && value
  );

  if (activeEntries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {activeEntries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-2 rounded-full bg-cafe-primary text-white px-4 py-2 text-sm shadow"
        >
          <span>{labels[key] || key}: {value}</span>
          <button onClick={() => onClear(key)} className="text-white/70 hover:text-white">
            ✕
          </button>
        </span>
      ))}
      <button
        onClick={() => onClear("all")}
        className="text-sm text-cafe-primary underline decoration-cafe-accent decoration-2"
      >
        Clear all
      </button>
    </div>
  );
};

export default FilterPills;
