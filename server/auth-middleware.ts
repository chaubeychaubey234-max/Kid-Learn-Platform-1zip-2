import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || "default-secret-key";

type AuthUser = {
  id: number;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err, user: any) => {
      if (err) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

export function authorizeParent(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.role === "parent") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Parents only." });
  }
}

export function authorizeCreator(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.role === "creator") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Creators only." });
  }
}