export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect everything except login, api/auth, static assets
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
