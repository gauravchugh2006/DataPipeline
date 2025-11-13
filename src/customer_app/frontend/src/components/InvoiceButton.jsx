import React from "react";

const InvoiceButton = ({ orderId }) => {
  const handleDownload = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    const token = localStorage.getItem("cafe-commerce-token");
    const url = `${apiBase}/orders/${orderId}/invoice`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = `order-${orderId}.pdf`;
        link.click();
      });
  };

  return (
    <button
      onClick={handleDownload}
      className="text-sm text-cafe-primary underline decoration-cafe-accent decoration-2"
    >
      Download invoice
    </button>
  );
};

export default InvoiceButton;
