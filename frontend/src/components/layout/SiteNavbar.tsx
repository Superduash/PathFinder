import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Route as RouteIcon, Sun, Moon, ArrowRight, Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { path: "/visualizer", label: "Visualizer" },
  { path: "/benchmark", label: "Benchmark" },
  { path: "/lab", label: "ML Lab" },
  { path: "/about", label: "About" },
];

export const SiteNavbar: React.FC = () => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isVisualizer = location.pathname.startsWith("/visualizer");

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "border-b border-border bg-bg/85 backdrop-blur-sm"
          : "border-b border-transparent bg-transparent"
      } ${isVisualizer ? "bg-surface border-b border-border" : ""}`}
    >
      <div className="max-w-6xl mx-auto h-16 px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/30 flex items-center justify-center text-brand transition-transform group-hover:scale-105">
            <RouteIcon className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg tracking-tight text-text">PathFinder</span>
        </Link>

        {/* Center Pill Nav (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-surface-2/80 border border-border">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive ? "text-brand-ink" : "text-muted hover:text-text"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full bg-brand"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 border border-border transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* Quick launch visualizer button */}
          {!isVisualizer && (
            <Link to="/visualizer" className="hidden sm:inline-flex">
              <Button size="sm" className="gap-1.5 text-xs font-semibold">
                Try it <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-8 h-8 flex items-center justify-center text-muted hover:text-text"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface p-4 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-2"
            >
              {item.label}
            </Link>
          ))}
          <Link to="/visualizer" onClick={() => setMobileMenuOpen(false)} className="mt-2">
            <Button className="w-full justify-center">Launch Visualizer</Button>
          </Link>
        </div>
      )}
    </header>
  );
};

