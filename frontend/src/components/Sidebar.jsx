import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Coins, ArrowLeftRight,
  Settings, Shield, Users, X, Baby, LogOut,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

const PARENT_LINKS = [
  { to: "/parent",               icon: LayoutDashboard, label: "Dashboard",    end: true },
  { to: "/parent/allowance",     icon: Coins,           label: "Allowance"              },
  { to: "/parent/transactions",  icon: ArrowLeftRight,  label: "Transactions"           },
  { to: "/parent/settings",      icon: Settings,        label: "Settings"               },
];

const CHILD_LINKS = [
  { to: "/child",               icon: LayoutDashboard, label: "Dashboard",   end: true },
  { to: "/child/transactions",  icon: ArrowLeftRight,  label: "Transactions"           },
];

export default function Sidebar({ open, onClose, mode = "parent" }) {
  const { isDemoMode, setRole } = useWallet();
  const navigate = useNavigate();
  const links = mode === "parent" ? PARENT_LINKS : CHILD_LINKS;

  function handleSignOut() {
    setRole(null);
    navigate("/");
    onClose?.();
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`
          fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-100
          z-40 flex flex-col transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        aria-label="Sidebar navigation"
      >
        {/* Mode badge */}
        <div className="px-4 pt-5 pb-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold
            ${mode === "parent" ? "bg-brand/10 text-brand" : "bg-brand-accent/10 text-cyan-700"}`}>
            {mode === "parent" ? <Shield size={14} /> : <Baby size={14} />}
            {mode === "parent" ? "Parent View" : "Child View"}
            {isDemoMode && (
              <span className="ml-auto badge-info text-xs">Demo</span>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Sidebar links">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                isActive ? "nav-link-active" : "nav-link"
              }
            >
              <Icon size={18} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-5 border-t border-gray-100 pt-3">
          <button
            onClick={handleSignOut}
            className="nav-link text-red-500 hover:bg-red-50 w-full"
          >
            <LogOut size={18} aria-hidden /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
