import { NavLink, Outlet } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";

export default function AthleteLayout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <nav className="bg-white border-b border-gray-200 flex justify-center gap-1 px-4">
        <NavLink
          to="/mon-espace"
          className={({ isActive }) =>
            `px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive ? "border-toec-green text-toec-green-dark" : "border-transparent text-gray-500"
            }`
          }
        >
          Ma fiche
        </NavLink>
        <NavLink
          to="/questionnaire"
          className={({ isActive }) =>
            `px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive ? "border-toec-green text-toec-green-dark" : "border-transparent text-gray-500"
            }`
          }
        >
          Questionnaire
        </NavLink>
      </nav>
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <Outlet />
      </main>
      <div className="text-center pb-4">
        <button onClick={signOut} className="text-sm text-toec-green-dark hover:underline">
          Déconnexion
        </button>
      </div>
    </div>
  );
}
