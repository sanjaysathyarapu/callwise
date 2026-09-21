import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the auth config (no providers with Node-only deps
// like bcrypt or the DB driver) — used by middleware.
export const edgeAuthConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sv = user.sv ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.sv = Number(token.sv ?? 0);
      }
      return session;
    },
  },
  providers: [],
};
