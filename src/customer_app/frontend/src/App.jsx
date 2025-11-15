import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLayout from "./pages/routes/AdminLayout";
import ReminderConfigurationPage from "./pages/routes/ReminderConfigurationPage";
import DashboardLanding from "./pages/routes/DashboardLanding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLanding />} />
        <Route path="/reminders" element={<ReminderConfigurationPage />} />
        <Route path="/admin/*" element={<AdminLayout />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
