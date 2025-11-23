import React from "react";

const MapEmbed = () => {
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const place = encodeURIComponent("10 rue Gaston Levy, Sevran-Livry, France 93270");
  const src = `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${place}`;
  return (
    <div className="rounded-3xl overflow-hidden shadow-xl border border-cafe-primary/10">
      <iframe
        title="Cafe Commerce Headquarters"
        src={src}
        width="100%"
        height="320"
        allowFullScreen
        loading="lazy"
        className="w-full"
      />
    </div>
  );
};

export default MapEmbed;
