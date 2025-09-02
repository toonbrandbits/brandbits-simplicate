import React from "react";
import { NavLink, Link } from "react-router-dom";
import { UserButton, useUser } from "@stackframe/react";
import { Button } from "@/components/ui/button";

export const AppNav: React.FC = () => {
  const user = useUser();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? "text-black font-semibold" : "text-black hover:text-amber-900"}`;

  return (
    <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src="/images.png" alt="Logo" className="h-10 w-10 rounded" />
              <span className="text-xl font-bold text-black">BRANDBITS®</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/companies" className={linkClass}>
              Bedrijven 
            </NavLink>
            <NavLink to="/projects" className={linkClass}>
              Projecten
            </NavLink>
            <NavLink to="/time-tracking" className={linkClass}>
              Uren
            </NavLink>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden md:inline text-sm text-amber-700">Welkom terug!</span>
                <UserButton />
              </div>
            ) : (
              <Link to="/auth/login">
                <Button>Login</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}; 