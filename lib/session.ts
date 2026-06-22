// Edge-совместимая работа с JWT-сессией (используется и в middleware, и на сервере).
import { SignJWT, jwtVerify } from "jose";

const RAW_SECRET = process.env.SESSION_SECRET;

// В продакшене требуем сильный секрет — иначе сессии можно подделать
if (process.env.NODE_ENV === "production" && (!RAW_SECRET || RAW_SECRET.length < 32)) {
  throw new Error("SESSION_SECRET должен быть задан (минимум 32 символа) в продакшене");
}

const SECRET = new TextEncoder().encode(
  RAW_SECRET || "dev-insecure-secret-change-me-please-32+chars",
);

export const SESSION_COOKIE = "kp_session";

export interface Session {
  userId: number;
  username: string;
  name: string;
  role: "ADMIN" | "MANAGER";
}

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      userId: payload.userId as number,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as "ADMIN" | "MANAGER",
    };
  } catch {
    return null;
  }
}
