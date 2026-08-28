import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      employeeId: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: Role;
    employeeId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    employeeId: string | null;
  }
}
