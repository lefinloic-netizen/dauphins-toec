import { NavLink, Outlet } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/programmation", label: "Programmation" },
  { to: "/creer-seance", label: "Créer une séance" },
  { to: "/historique", label: "Historique" },
  { to: "/bibliotheque", label: "Bibliothèque" },
  { to: "/groupes", label: "Groupes" },
];

export default function CoachLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-toec-green text-toec-green-dark"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 whitespace-nowrap pl-4">
          <span>{profile?.first_name}</span>
          <button onClick={signOut} className="text-toec-green-dark hover:underline">
            Déconnexion
          </button>
        </div>
      </nav>
      <main className="flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
