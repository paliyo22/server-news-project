import type { NextFunction, Request, Response } from "express";
import { Role } from "../enum/role";

/**
 * Middleware to authorize the user based on their role.
 * 
 * This middleware checks if the authenticated user has the 'ADMIN' role. 
 * If the user is an admin, it proceeds to the next middleware or route handler.
 * If the user is not an admin or is not authenticated, it responds with a 
 * 403 Forbidden error and a message indicating that the route is restricted to admins only.
 * 
 * @function authorizeAdmin
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware or route handler to be executed if the user is authorized.
 * @returns {void} If the user has the 'ADMIN' role, it proceeds to the next middleware. 
 * If not, it sends a 403 Forbidden response with an error message.
 */
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== Role.ADMIN) {
        res.status(403).json({ error: "Forbidden: Admins only" });
        return;
    }
    next();
};