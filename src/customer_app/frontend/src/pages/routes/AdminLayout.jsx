import { Suspense, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Route, Routes } from "react-router-dom";
import AdminGrid from "../../components/AdminGrid";

const AdminLayout = () => {
  const queryClient = useQueryClient();

  const grids = useMemo(
    () => [
      { path: "products", label: "Products", entity: "products" },
      { path: "customers", label: "Customers", entity: "customers" },
      { path: "orders", label: "Orders", entity: "orders" }
    ],
    []
  );

  return (
    <div className="admin-layout">
      <aside>
        <h1>Admin console</h1>
        <nav>
          <ul>
            {grids.map((grid) => (
              <li key={grid.path}>
                <Link to={grid.path}>{grid.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main>
        <Suspense fallback={<p>Loading grid…</p>}>
          <Routes>
            {grids.map((grid) => (
              <Route
                key={grid.path}
                path={`${grid.path}`}
                element={<AdminGrid queryClient={queryClient} entity={grid.entity} title={grid.label} />}
              />
            ))}
            <Route index element={<p>Select a grid to begin managing data.</p>} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

export default AdminLayout;
