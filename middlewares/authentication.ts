import type { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";
import config from "../config";

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken;

    if (!token) {
        res.status(401).json({ error: "No token provided" });
        return;
    }

    try {
        const decoded = verify(token, config.jwtSecret);

        if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
            res.status(403).json({ error: "Invalid or expired token" });
            return;
        }

        (req as any).user = decoded;
        next();
    } catch (e) {
        res.status(403).json({ error: "Invalid or expired token" });
    }
};
