import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    sv?: number;
  }
  interface Session {
    user: {
      id: string;
      sv?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    sv?: number;
  }
}
