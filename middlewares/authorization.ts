import type { NextFunction, Request, Response } from "express";
import { Role } from "../enum/role";

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== Role.ADMIN) {
        res.status(403).json({ error: "Forbidden: Admins only" });
        return;
    }
    next();
};