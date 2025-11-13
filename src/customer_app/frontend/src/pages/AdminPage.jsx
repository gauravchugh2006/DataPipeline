import React, { useEffect, useState } from "react";

import { apiClient } from "../hooks/useProducts.js";
import { useAuth } from "../context/AuthContext.jsx";

const STATUSES = ["pending", "preparing", "ready", "completed", "cancelled"];

const AdminPage = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const loadOrders = async () => {
      if (!token) return;
      const { data } = await apiClient.get("/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data.items);
    };
    loadOrders();
  }, [token]);

  const updateStatus = async (orderId, status) => {
    await apiClient.patch(
      `/orders/${orderId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    );
  };

  return (
    <section className="container mx-auto px-6 py-16 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Admin control room</h1>
        <p className="text-sm text-cafe-primary/70">
          Update live order statuses and oversee kitchen throughput in real time.
        </p>
      </header>
      <div className="space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="bg-white rounded-3xl p-6 card-shadow border border-cafe-primary/5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase text-cafe-primary/50">Order #{order.id}</p>
                <p className="text-sm text-cafe-primary/70">
                  Customer: {order.customer_name || order.user_id}
                </p>
              </div>
              <select
                value={order.status}
                onChange={(event) => updateStatus(order.id, event.target.value)}
                className="rounded-2xl border border-cafe-primary/10 px-4 py-2"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <ul className="mt-4 text-sm text-cafe-primary/80 space-y-1">
              {order.items.map((item) => (
                <li key={`${order.id}-${item.variantId}`}>
                  {item.quantity} × {item.productName} — €{Number(item.unitPrice).toFixed(2)}
                </li>
              ))}
            </ul>
          </article>
        ))}
        {orders.length === 0 && (
          <p className="text-sm text-cafe-primary/70">No orders available. Encourage customers to place new ones!</p>
        )}
      </div>
    </section>
  );
};

export default AdminPage;
