import React, { useEffect, useState } from "react";

import Dashboard from "../components/Dashboard.jsx";
import { apiClient } from "../hooks/useProducts.js";
import { useAuth } from "../context/AuthContext.jsx";

const DashboardPage = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const loadOrders = async () => {
      if (!token) {
        setOrders([]);
        return;
      }
      const { data } = await apiClient.get("/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data.items);
    };
    loadOrders();
  }, [token]);

  return (
    <section className="container mx-auto px-6 py-16">
      <Dashboard orders={orders} />
    </section>
  );
};

export default DashboardPage;
