"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function NavbarWrapper() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Hide navbar on login page
  if (pathname === "/login") return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">M</div>
        <div>
          <div className="navbar-title">Advisor Dashboard</div>
          <div className="navbar-subtitle">Montserrat Advisory</div>
        </div>
      </div>
      <div className="navbar-right">
        {session?.user && (
          <>
            <span className="navbar-status">
              <span className="navbar-dot"></span>
              Live Data
            </span>
            <span className="navbar-advisor">{session.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="navbar-logout"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
