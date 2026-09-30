import { Routes, Route, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Materials from "./pages/Materials";
import Experiments from "./pages/Experiments";
import SimLab from "./pages/SimLab";
import Calculators from "./pages/Calculators";
import Planner from "./pages/Planner";
import PaperAnalyzer from "./pages/PaperAnalyzer";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import ResearchWorkspace from "./pages/ResearchWorkspace";
import ResearchStudio from "./pages/ResearchStudio";
import CalculationHistory from "./pages/CalculationHistory";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import OriginalChatbot from "./components/OriginalChatbot";

export default function App() {
  const location = useLocation();
  const showGlobalChat = !location.pathname.startsWith("/dashboard");

  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="workspace" element={<ResearchWorkspace />} />
        <Route path="research-studio" element={<ResearchStudio />} />
        <Route path="calculation-history" element={<CalculationHistory />} />
        <Route path="materials" element={<Materials />} />
        <Route path="experiments" element={<Experiments />} />
        <Route path="sim-lab" element={<SimLab />} />
        <Route path="calculators" element={<Calculators />} />
        <Route path="planner" element={<Planner />} />
        <Route path="paper-analyzer" element={<PaperAnalyzer />} />
        <Route path="reports" element={<Reports />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
    {showGlobalChat && <OriginalChatbot />}
    </>
  );
}
