import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Shield, Baby, Users, LogOut } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

export default function Navbar({ onMenuToggle, sidebarOpen }) {
  const { role, setRole, shortAddress, account } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";

  function handleSignOut() {
    setRole(null);
    navigate("/");
  }

  const homeLink = role === "parent" ? "/parent" : role === "child" ? "/child" : "/";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 max-w-screen-2xl mx-auto">

        {/* Left — hamburger + logo */}
        <div className="flex items-center gap-3">
          {role && !isLanding && (
            <button onClick={onMenuToggle} className="btn-ghost p-2 lg:hidden" aria-label="Toggle menu">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          <Link to={homeLink} className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-sm">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-brand text-lg tracking-tight hidden sm:block">KidSafe</span>
          </Link>
        </div>

        {/* Right — role badge + wallet + sign out */}
        <div className="flex items-center gap-2">
          {/* Role badge */}
          {role && (
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              role === "parent"
                ? "bg-blue-50 text-brand border border-blue-100"
                : "bg-cyan-50 text-cyan-700 border border-cyan-100"
            }`}>
              {role === "parent" ? <Users size={12} /> : <Baby size={12} />}
              {role === "parent" ? "Parent" : "Child"}
            </span>
          )}

          {/* Wallet address */}
          {account && (
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono text-gray-600">{shortAddress}</span>
            </div>
          )}

          {/* Sign out */}
          {role && (
            <button
              onClick={handleSignOut}
              className="btn-ghost text-gray-500 hover:text-red-500 text-sm gap-1.5"
              aria-label="Sign out"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
