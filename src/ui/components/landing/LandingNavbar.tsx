import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { label: "Home", href: "/" },
    { label: "Features", href: "#features" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "Contact Us", href: "#contact" },
  ];

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
      }`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <Image src="/favicon.png" alt="Logo" width={32} height={32} className="object-cover" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Immaculate Aegis</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const isHash = l.href.startsWith("#");
            const isHome = l.href === "/";
            if (isHash) {
              return (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.querySelector(l.href);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  {l.label}
                </a>
              );
            }
            if (isHome) {
              return (
                <button
                  key={l.label}
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  {l.label}
                </button>
              );
            }
            return (
              <Link
                key={l.label}
                href={l.href}
                className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors">
            Sign in
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white/60 hover:text-white" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#030712]/95 backdrop-blur-xl border-b border-white/5"
          >
            <div className="px-6 py-4 flex flex-col gap-2">
              {links.map((l) => {
                const isHash = l.href.startsWith("#");
                return isHash ? (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.querySelector(l.href);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                      setMobileOpen(false);
                    }}
                    className="py-2 text-sm text-white/60 hover:text-white text-left transition-colors"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="py-2 text-sm text-white/60 hover:text-white text-left transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </Link>
                );
              })}
              <div className="flex gap-3 mt-2">
                <Link href="/login" className="flex-1 py-2 text-sm bg-white text-black rounded-lg font-medium text-center" onClick={() => setMobileOpen(false)}>Sign in</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
