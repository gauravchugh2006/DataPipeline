import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import AppLayout from "./components/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

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
      <CartProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products/:productId" element={<ProductPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/admin"
              element={
                <PrivateRoute roles={["admin"]}>
                  <AdminPage />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
