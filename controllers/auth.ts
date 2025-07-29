import type { Request, Response } from "express";
import type { IAuthModel } from "../interfaces";
import { validateAuth, validatePassword, validateUser, type UserOutput } from "../schemas";
import { sign } from "jsonwebtoken";
import config from "../config";
import { Role } from "../enum";
import { getUserById, logOut } from "../services";

/**
 * Controller for handling authentication-related operations such as registration, login, logout,
 * token refresh, password change, and role management.
 *
 * @class AuthController
 * @param {IAuthModel} authModel - The authentication model instance used for data operations.
 */
export class AuthController {
    
    /**
     * Creates an instance of AuthController.
     * @param {IAuthModel} authModel - The authentication model instance.
     */
    constructor(private readonly authModel: IAuthModel) {}

    /**
     * Handles successful authentication by generating and setting access and refresh tokens as cookies.
     * @private
     * @param {UserOutput} user - The authenticated user.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    private async handleAuthSuccess(user: UserOutput, res: Response): Promise<void> {
        const jwtAccessExpiry = '15m';
        const jwtAccessExpiryMs = 15 * 60 * 1000;
        const jwtRefreshExpiry = '1d';
        const jwtRefreshExpiryMs = 60 * 60 * 1000 * 24;

        const accessToken = sign(
            { id: user.id, username: user.username, role: user.role },
            config.jwtSecret,
            { expiresIn: jwtAccessExpiry }
        );
        const refreshToken = sign(
            { id: user.id },
            config.jwtSecretRefresh,
            { expiresIn: jwtRefreshExpiry }
        );

        await this.authModel.saveToken(user.id!, refreshToken);

        res
            .cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: jwtAccessExpiryMs
            })
            .cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: jwtRefreshExpiryMs
            })
            .status(200)
            .json({ username: user.username, role: user.role });
    }

    /**
     * Registers a new user.
     * Validates the input, creates the user, and logs them in by setting tokens.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    register = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = validateUser(req.body);

            if (!result.success) {
                console.log(result.issues)
                res.status(422).json({ errors: result.issues });
                return;
            }

            const newUser = await this.authModel.createUser(result.output);
            if(typeof newUser === 'boolean'){
                if(newUser){
                    res.status(409).json({ error: "This Username already exist"});
                    return;
                }
                res.status(409).json({ error: "This Email already exist"});
                return;
            }
            try{
                await this.handleAuthSuccess(newUser, res);    
            }catch(err){
                throw new Error('Error loging in');
            }

        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Logs in a user.
     * Validates credentials, activates the user if needed, and sets tokens.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    logIn = async (req: Request, res: Response): Promise<void> => {
        const result = validateAuth(req.body);

        if (!result.success) {
            res.status(422).json({ errors: result.issues });
            return;
        }

        try {
            const user = await this.authModel.logIn(result.output);

            if (!user) {
                res.status(401).json({ error: "Invalid email or password" });
                return;
            }

            if (!user.is_active) {
                try {
                    await this.authModel.activate(user.id);
                    user.is_active = true;
                } catch (activationError) {
                    res.status(500).json({ error: "Account could not be reactivated" });
                    return;
                }
            }

            await this.handleAuthSuccess(user, res);

        } catch (e) {
            console.error("Login error:", e); // BORRAR 
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Logs out a user by revoking their refresh token and clearing authentication cookies.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    logOut = async (req: Request, res: Response): Promise<void> => {
        try{
            await logOut(req, res, this.authModel);
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ error: "Internal Error"}); // Error al borrar el token
        }
    }

    /**
     * Refreshes the user's session by issuing new access and refresh tokens.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    refresh = async (req: Request, res: Response): Promise<void> => {
        const oldRefreshToken = (req as any).user

        try {
            const user = await getUserById(oldRefreshToken.id, this.authModel, req.cookies.refreshToken);

            if (!user) {
                if(req.cookies.accessToken){
                    res.clearCookie('accessToken', {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
                    });    
                }

                res.clearCookie('refreshToken', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
                });

                res.status(403).json({ error: 'User not found or invalid refresh token' });
                return;
            }
    
            try {
                await this.handleAuthSuccess(user, res);
            } catch (err) {
                res.status(500).json({ error: 'Could not refresh session. Please try again.' });
                return;
            }
            

        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Changes the user's password.
     * Validates the old and new passwords and updates them in the database.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    newPassword = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user
        const {oldPass, newPass} = req.body;
        const oldPassword = validatePassword(oldPass);
        const newPassword = validatePassword(newPass);

        if (!oldPassword.success || !newPassword.success) {
            res.status(422).json({ errors: "Bad request" });
            return;
        }
        try {
            const result = await this.authModel.newPassword(token.id, oldPassword.output, newPassword.output);
            if(!result){
                res.status(400).json({ errors: "Rejected" });
                return;
            }
            res.status(200).json({ success: true });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
    
    /**
     * Updates the user's role.
     * Validates the role and user ID, then updates the user's role in the database.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    newRole = async (req: Request, res: Response): Promise<void> => {
        const {id, role} = req.body;
        if(!Object.values(Role).includes(role) || typeof id !== 'string' || id.trim() === ""){
            res.status(422).json({ errors: "Bad request" });
            return;
        }
        try {
            await this.authModel.newRole(id, role)
            res.status(200).json({ success: true });
        } catch (e) {
            if (e instanceof Error) {
                res.status(400).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

}


