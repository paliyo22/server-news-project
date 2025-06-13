import type { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";
import config from "../config";

/**
 * Middleware to authenticate the user based on the provided JWT token in the request's cookies.
 * 
 * This middleware checks if an `accessToken` is present in the cookies. If it is, it verifies
 * the token using a secret key. If the token is valid, the decoded user data is attached to 
 * the request object, and the request proceeds to the next middleware or route handler. 
 * If the token is missing, invalid, or expired, the middleware responds with an error.
 * 
 * @function authenticateToken
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware or route handler to be executed if the token is valid.
 * @returns {void} If the token is valid, it proceeds to the next middleware. If not, it sends a response with an error message.
 */
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
