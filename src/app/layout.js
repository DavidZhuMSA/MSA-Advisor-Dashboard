import "./globals.css";
import { SessionProvider } from "next-auth/react";
import NavbarWrapper from "./components/NavbarWrapper";

export const metadata = {
  title: "MSA Advisor Dashboard",
  description: "Real-time client monitoring for Montserrat Advisory",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="dashboard-layout">
            <NavbarWrapper />
            <main className="main-content">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
