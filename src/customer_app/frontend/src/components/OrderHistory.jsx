import React from "react";

import InvoiceButton from "./InvoiceButton.jsx";

const OrderHistory = ({ orders }) => {
  if (!orders.length) {
    return <p className="text-sm text-cafe-primary/70">No orders yet. Start crafting your favourites!</p>;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <article key={order.id} className="bg-white rounded-3xl p-6 card-shadow border border-cafe-primary/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase text-cafe-primary/50">Order #{order.id}</p>
              <p className="text-lg font-semibold">Status: {order.status}</p>
              <p className="text-sm text-cafe-primary/70">
                Placed {new Date(order.created_at).toLocaleString()} — €{Number(order.total).toFixed(2)}
              </p>
            </div>
            <InvoiceButton orderId={order.id} />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-cafe-primary/80">
            {order.items.map((item) => (
              <li key={`${order.id}-${item.variantId}`}>
                {item.quantity} × {item.productName} ({item.color} / {item.size}) — €
                {Number(item.unitPrice).toFixed(2)}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
};

export default OrderHistory;
