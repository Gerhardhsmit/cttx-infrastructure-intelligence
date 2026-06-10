import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/** Dev guest user returned when DATABASE_URL is not configured (local dev mode) */
const DEV_GUEST_USER: User = {
  id: 0,
  openId: "dev-local-guest",
  email: "dev@localhost",
  name: "Local Developer",
  loginMethod: "local",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // In local dev mode (no DATABASE_URL), bypass auth and use a guest user
  if (!process.env.DATABASE_URL) {
    return {
      req: opts.req,
      res: opts.res,
      user: DEV_GUEST_USER,
    };
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
