import React from "react";
import { Outlet } from "react-router-dom";
import { AppNav } from "./AppNav";

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <AppNav />
      <main className="container mx-auto px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}; 