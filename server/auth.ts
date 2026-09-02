import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import { pool, db } from "./db";
import { staffUsers } from "@shared/schema";

const scryptAsync = promisify(scrypt);
const PgSession = connectPg(session);

export type StaffRole = "owner" | "executive";
export type StaffSession = { id: number; role: StaffRole; name: string; email: string };

const OWNER_PATHS = [
  "/api/finance",
  "/api/payments",
  "/api/expenses",
  "/api/cash-positions",
  "/api/finance-settings",
  "/api/capital-entries",
  "/api/rental-bills",
  "/api/ops/bootstrap",
];

const PUBLIC_API = new Set(["/api/auth/login", "/api/auth/logout", "/api/auth/me"]);

function apiPath(req: Request) {
  return (req.originalUrl || req.url || "").split("?")[0];
}

function isPublicApi(req: Request) {
  const path = apiPath(req);
  if (req.method === "POST" && path === "/api/enquiries") return true;
  return PUBLIC_API.has(path);
}

function isOwnerApi(path: string) {
  return OWNER_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const dummy = "scrypt$00$00";
  const value = stored && stored.startsWith("scrypt$") ? stored : dummy;
  const [, saltHex, hashHex] = value.split("$");
  if (!saltHex || !hashHex || saltHex.length < 8) {
    const waste = (await scryptAsync(password, randomBytes(16), 64)) as Buffer;
    timingSafeEqual(waste, waste);
    return false;
  }
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

const loginHits = new Map<string, { count: number; resetAt: number }>();

function loginAllowed(ip: string) {
  const now = Date.now();
  const row = loginHits.get(ip);
  if (!row || now > row.resetAt) {
    loginHits.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (row.count >= 8) return false;
  row.count += 1;
  return true;
}

function publicStaff(row: typeof staffUsers.$inferSelect): StaffSession {
  return { id: row.id, role: row.role as StaffRole, name: row.name, email: row.email };
}

export async function ensureStaff() {
  const existing = await db.select({ id: staffUsers.id }).from(staffUsers).limit(1);
  if (existing[0]) return;

  const ownerEmail = (process.env.AUTH_OWNER_EMAIL || "samir@switchrental.in").trim().toLowerCase();
  const execEmail = (process.env.AUTH_EXEC_EMAIL || "mill@switchrental.in").trim().toLowerCase();
  const ownerPass = process.env.AUTH_OWNER_PASSWORD;
  const execPass = process.env.AUTH_EXEC_PASSWORD;
  if (!ownerPass || !execPass || ownerPass.length < 12 || execPass.length < 12) {
    console.error("AUTH_OWNER_PASSWORD and AUTH_EXEC_PASSWORD (12+ chars) are required to create the first logins.");
    return;
  }

  await db.insert(staffUsers).values([
    {
      email: ownerEmail,
      name: "Samir Chhabria",
      role: "owner",
      passwordHash: await hashPassword(ownerPass),
    },
    {
      email: execEmail,
      name: "Mill desk",
      role: "executive",
      passwordHash: await hashPassword(execPass),
    },
  ]);
  console.log(`staff logins created for ${ownerEmail} (owner) and ${execEmail} (executive)`);
}

export async function setupAuth(app: Express) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a long random string (32+ characters).");
  }

  app.set("trust proxy", 1);
  app.use(
    session({
      name: "switch.sid",
      secret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 8 * 60 * 60 * 1000,
      },
      store: new PgSession({
        pool,
        tableName: "staff_sessions",
        createTableIfMissing: true,
      }),
    }),
  );

  await ensureStaff();

  app.post("/api/auth/login", async (req, res) => {
    const ip = String(req.ip || req.socket.remoteAddress || "unknown");
    if (!loginAllowed(ip)) {
      return res.status(429).json({ message: "Too many login attempts. Wait 15 minutes." });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const rows = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
    const user = rows[0];
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return res.status(423).json({ message: "This login is locked. Try again later." });
    }

    const ok = await verifyPassword(password, user?.passwordHash || "");
    if (!user || !ok) {
      if (user) {
        const fails = (user.failedLogins || 0) + 1;
        await db
          .update(staffUsers)
          .set({
            failedLogins: fails,
            lockedUntil: fails >= 8 ? new Date(Date.now() + 30 * 60 * 1000) : null,
            updatedAt: new Date(),
          })
          .where(eq(staffUsers.id, user.id));
      }
      return res.status(401).json({ message: "Invalid email or password." });
    }

    await db
      .update(staffUsers)
      .set({ failedLogins: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(staffUsers.id, user.id));

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.staff = publicStaff(user);
    res.json(publicStaff(user));
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("switch.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.staff) return res.status(401).json({ message: "Not signed in." });
    res.json(req.session.staff);
  });

  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    const path = apiPath(req);
    if (isPublicApi(req)) return next();
    const staff = req.session.staff;
    if (!staff) return res.status(401).json({ message: "Sign in required." });
    if (isOwnerApi(path) && staff.role !== "owner") {
      return res.status(403).json({ message: "Owner access only." });
    }
    next();
  });
}

declare module "express-session" {
  interface SessionData {
    staff?: StaffSession;
  }
}
