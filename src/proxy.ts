import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { edgeAuthConfig } from "@/lib/auth/edge-config";

const { auth } = NextAuth(edgeAuthConfig);

// Send logged-out visitors to the login page and bring them back afterwards.
export default auth((req) => {
  if (!req.auth) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/assistants/:path*", "/conversations/:path*", "/settings/:path*"],
};
