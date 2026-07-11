import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

const routes = ["/", "/layout", "/interactions", "/diagnostics", "/readability", "/static-rules"];

export default function FixtureLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="lab-header">
          <div>
            <strong>Lutest Runtime Audit Lab</strong>
            <span>Intentional production fixtures</span>
          </div>
          <nav aria-label="Fixture routes">
            {routes.map((route) => <Link key={route} href={route}>{route === "/" ? "Catalog" : route.slice(1)}</Link>)}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
