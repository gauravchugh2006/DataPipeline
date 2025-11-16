import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import AppLayout from "./components/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminProductsPage from "./pages/admin/AdminProductsPage.jsx";
import AdminCustomersPage from "./pages/admin/AdminCustomersPage.jsx";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage.jsx";

const PrivateRoute = ({ children, roles }) => {
  const { profile } = useAuth();
  if (!profile) {
    return <Navigate to="/dashboard" replace />;
  }
  if (roles && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products/:productId" element={<ProductPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route
                path="/admin"
                element={
                  <PrivateRoute roles={["admin"]}>
                    <AdminLayout />
                  </PrivateRoute>
                }
              >
              <Route index element={<Navigate to="products" replace />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
            </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </CartProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
