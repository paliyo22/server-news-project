import type { Request, Response, NextFunction } from "express";
import config from "../config";
import { verify } from "jsonwebtoken";

/**
 * Middleware to authenticate and validate the refresh token.
 * 
 * This middleware is used to verify the refresh token from the request cookies.
 * If the refresh token is valid, the user's information is decoded and attached
 * to the request. If the token is missing, invalid, or expired, a 403 error is 
 * sent, and the refresh token cookie is cleared.
 */
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