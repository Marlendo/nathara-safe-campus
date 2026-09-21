import { Routes, Route } from "react-router-dom";

import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/public/Home";
import About from "./pages/public/About";
import ReportType from "./pages/public/ReportType";
import SafetyAssessment from "./pages/public/SafetyAssessment";
import IncidentDetails from "./pages/public/IncidentDetails";
import ReporterInfo from "./pages/public/ReporterInfo";
import ReviewReport from "./pages/public/ReviewReport";
import ReportSuccess from "./pages/public/ReportSuccess";
import ProtectionPath from "./pages/public/ProtectionPath";
import SupportServices from "./pages/public/SupportServices";
import CaseStatus from "./pages/public/CaseStatus";

import Login from "./pages/dashboard/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Reports from "./pages/dashboard/Reports";
import ReportDetails from "./pages/dashboard/ReportDetails";

import AdminRoute from "./components/AdminRoute";
import AdminUsers from "./pages/admin/Users";
import AdminServices from "./pages/admin/Services";
import AdminActivity from "./pages/admin/Activity";

export default function App() {
  return (
    <Routes>
      {/* Public (reporting experience) */}
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="report" element={<ReportType />} />
        <Route path="report/safety" element={<SafetyAssessment />} />
        <Route path="report/details" element={<IncidentDetails />} />
        <Route path="report/contact" element={<ReporterInfo />} />
        <Route path="report/review" element={<ReviewReport />} />
        <Route path="report/success" element={<ReportSuccess />} />
        <Route path="protection" element={<ProtectionPath />} />
        <Route path="support" element={<SupportServices />} />
        <Route path="case-status" element={<CaseStatus />} />
      </Route>

      {/* Dashboard (responders) */}
      <Route path="dashboard/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard/cases" element={<Reports />} />
        <Route path="dashboard/cases/:id" element={<ReportDetails />} />

        {/* Admin panel (admin role only) */}
        <Route
          path="dashboard/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="dashboard/admin/services"
          element={
            <AdminRoute>
              <AdminServices />
            </AdminRoute>
          }
        />
        <Route
          path="dashboard/admin/activity"
          element={
            <AdminRoute>
              <AdminActivity />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<PublicLayout />} />
    </Routes>
  );
}