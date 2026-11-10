import React from "react";
import { SiteNavbar } from "./layout/SiteNavbar";
import { SiteFooter } from "./layout/SiteFooter";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans selection:bg-brand/20 selection:text-brand">
      <SiteNavbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
};
