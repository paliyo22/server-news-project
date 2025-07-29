import type { Request, Response, NextFunction } from "express";
import config from "../config";
import { verify } from "jsonwebtoken";

/**
 * Express middleware to validate and refresh the user's refresh token.
 *
 * Checks for the presence of a refresh token in the request cookies.
 * If the token is valid, attaches the decoded user information to the request object and calls next().
 * If the token is missing, invalid, or expired, responds with an appropriate error and clears the refresh token cookie.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
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
            throw new Error()
        }

        (req as any).user = decoded;
        next();
    } catch (e) {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });
        res.status(403).json({ error: "Invalid or expired token" });
    }
};