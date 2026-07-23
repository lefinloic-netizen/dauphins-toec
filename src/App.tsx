import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import CoachLayout from "./layouts/CoachLayout";
import AthleteLayout from "./layouts/AthleteLayout";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import Dashboard from "./pages/Dashboard";
import Programmation from "./pages/Programmation";
import CreerSeance from "./pages/CreerSeance";
import Historique from "./pages/Historique";
import Bibliotheque from "./pages/Bibliotheque";
import Groupes from "./pages/Groupes";
import AthleteHome from "./pages/AthleteHome";
import Questionnaire from "./pages/Questionnaire";

function AppRoutes() {
  const { needsPasswordSetup } = useAuth();

  if (needsPasswordSetup) {
    return <SetPassword />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute requiredRole="coach">
            <CoachLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/programmation" element={<Programmation />} />
        <Route path="/creer-seance" element={<CreerSeance />} />
        <Route path="/historique" element={<Historique />} />
        <Route path="/bibliotheque" element={<Bibliotheque />} />
        <Route path="/groupes" element={<Groupes />} />
      </Route>

      <Route
        element={
          <ProtectedRoute requiredRole="athlete">
            <AthleteLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/mon-espace" element={<AthleteHome />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
