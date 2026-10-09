import { NavLink, Outlet } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { to: "/mon-espace", label: "Ma fiche" },
  { to: "/questionnaire", label: "Questionnaire" },
  { to: "/protocole", label: "Mon protocole" },
  { to: "/protocoles", label: "Protocoles" },
  { to: "/mon-historique", label: "Historique" },
];

export default function AthleteLayout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <nav className="bg-white border-b border-gray-200 flex justify-center gap-1 px-4 overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive ? "border-toec-green text-toec-green-dark" : "border-transparent text-gray-500"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
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
