import React, { useCallback, useEffect, useState } from "react";

import Dashboard from "../components/Dashboard.jsx";
import { apiClient, useProducts } from "../hooks/useProducts.js";
import { useAuth } from "../context/AuthContext.jsx";

const emptyOrderState = { items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 };

const DashboardPage = () => {
  const { token, profile, theme, personalizeTheme, updateProfile } = useAuth();
  const [orderFilters, setOrderFilters] = useState({
    page: 1,
    pageSize: 10,
    sortBy: "order_date",
    sortDir: "desc",
  });
  const [orders, setOrders] = useState(emptyOrderState);
  const [orderLoading, setOrderLoading] = useState(false);

  const fetchOrders = useCallback(
    async (filters) => {
      if (!token) {
        setOrders(emptyOrderState);
        return;
      }
      setOrderLoading(true);
      try {
        const params = Object.fromEntries(
          Object.entries(filters).filter(
            ([, value]) => value !== undefined && value !== null && value !== ""
          )
        );
        const { data } = await apiClient.get("/orders", {
          params,
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(data);
      } catch (error) {
        console.error("Unable to load orders", error);
        setOrders(emptyOrderState);
      } finally {
        setOrderLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      fetchOrders(orderFilters);
    } else {
      setOrders(emptyOrderState);
    }
  }, [token, orderFilters, fetchOrders]);

  const [productFilters, setProductFilters] = useState({ page: 1, pageSize: 25, sort: "name" });
  const { data: productData, isLoading: productLoading } = useProducts(productFilters);

  return (
    <section className="container mx-auto px-6 py-16">
      <Dashboard
        profile={profile}
        theme={theme}
        orders={orders}
        orderLoading={orderLoading}
        orderFilters={orderFilters}
        onOrderFiltersChange={setOrderFilters}
        refreshOrders={() => fetchOrders(orderFilters)}
        products={productData}
        productFilters={productFilters}
        onProductFiltersChange={setProductFilters}
        productLoading={productLoading}
        onThemeChange={personalizeTheme}
        onProfileUpdate={updateProfile}
      />
    </section>
  );
};

export default DashboardPage;
