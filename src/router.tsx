import { createBrowserRouter } from "react-router-dom";

import Dashboard from "@/pages/Dashboard";
import DashboardLayout from "@/components/layout/dashboard";

const Router = createBrowserRouter([
  {
    element: <DashboardLayout />,
    children: [
      { path: "/", element: <Dashboard /> },
    ],
  },
]);

export default Router;
