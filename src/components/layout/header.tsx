import Link from "next/link";
import { Container } from "@/components/layout/container";

const navLinks = [
  { href: "#", label: "Home" },
  { href: "#", label: "About" },
  { href: "#", label: "Contact" },
];

export function Header() {
  return (
    <header className="border-b border-border">
      <Container className="flex h-16 flex-wrap items-center justify-between gap-4 py-3">
        <span className="text-lg font-semibold">Hacktrack</span>
        <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
