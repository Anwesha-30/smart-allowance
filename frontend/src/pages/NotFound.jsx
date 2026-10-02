import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Home } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

export default function NotFound() {
  const navigate = useNavigate();
  const { account } = useWallet();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center mb-6 shadow-lg">
        <Shield size={28} className="text-white" aria-hidden />
      </div>

      {/* 404 */}
      <p className="text-8xl font-extrabold text-gray-100 select-none leading-none mb-2">404</p>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden /> Go Back
        </button>
        <button
          onClick={() => navigate(account ? "/parent" : "/")}
          className="btn-primary"
        >
          <Home size={16} aria-hidden />
          {account ? "Dashboard" : "Home"}
        </button>
      </div>
    </div>
  );
}
