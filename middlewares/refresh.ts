import type { Request, Response, NextFunction } from "express";
import config from "../config";
import { verify } from "jsonwebtoken";


export const refreshToken = (req: Request, res: Response, next: NextFunction) => {

    const token = req.cookies.refreshToken;
    
        if (!token) {
            res.status(401).json({ error: "No token provided" });
            return;
        }
    
        try {
            const decoded = verify(token, config.jwtSecretRefresh);
    
            if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
                res.status(403).json({ error: "Invalid or expired token" });
                return;
            }
    
            // Puedes guardar el usuario en req para usarlo después
            (req as any).user = decoded;
            next();
        } catch (e) {
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
            res.status(403).json({ error: "Invalid or expired token" });
        }
};