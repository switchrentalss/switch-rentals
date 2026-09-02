import { Link, useLocation } from "wouter";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { site } from "./content";
import { cn } from "@/lib/utils";

const links = [
  { href: "/collections", label: "Collection" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "Studio" },
  { href: "/contact", label: "Contact" },
];

export function SiteLayout({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = title
      ? `${title} — ${site.shortName}`
      : `${site.shortName} — Luxury tableware hire, Mumbai`;
  }, [title]);

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#1c1410]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0c0a09]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/">
            <img src={site.logo} alt={site.name} className="h-9 w-auto" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={cn(
                    "text-[13px] tracking-[0.14em] uppercase cursor-pointer transition-colors",
                    location === link.href ? "text-white" : "text-white/60 hover:text-white"
                  )}
                >
                  {link.label}
                </span>
              </Link>
            ))}
            <Link href="/contact">
              <span className="cursor-pointer rounded-full bg-[#c4a574] px-4 py-2 text-[12px] font-semibold tracking-wide text-[#1c1410]">
                Plan an event
              </span>
            </Link>
          </nav>
          <button
            className="md:hidden text-white"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="border-t border-white/10 bg-[#0c0a09] px-5 py-4 md:hidden">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <div className="py-3 text-sm uppercase tracking-[0.16em] text-white/80">{link.label}</div>
              </Link>
            ))}
            <Link href="/contact">
              <div className="py-3 text-sm text-[#c4a574]">Plan an event</div>
            </Link>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="bg-[#0c0a09] text-white/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-3">
          <div>
            <img src={site.logo} alt="" className="h-10 w-auto mb-4" />
            <p className="text-sm leading-relaxed max-w-xs">{site.tagline}</p>
          </div>
          <div className="text-sm space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#c4a574]">Visit</p>
            <p>{site.address}</p>
            <a className="underline decoration-white/20" href={site.maps} target="_blank" rel="noreferrer">
              Open in Maps
            </a>
          </div>
          <div className="text-sm space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#c4a574]">Talk to us</p>
            {site.phones.map((p) => (
              <p key={p.href}>
                <a href={p.href} className="hover:text-white">{p.display}</a>
              </p>
            ))}
            {site.emails.map((e) => (
              <p key={e}>
                <a href={`mailto:${e}`} className="hover:text-white">{e}</a>
              </p>
            ))}
            <a href={site.instagram} className="block hover:text-white" target="_blank" rel="noreferrer">
              {site.instagramHandle}
            </a>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-white/40 sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} {site.name}</span>
            <Link href="/app">
              <span className="cursor-pointer hover:text-white/70">Operations console — demo</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
