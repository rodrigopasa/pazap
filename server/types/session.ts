import session from "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      session: session.Session & Partial<session.SessionData>;
    }
  }
}

export {};