import type { Request, Response } from "express";
import type { IAuthModel } from "../interfaces";
import { validateAuth, validatePassword, validateUser, type UserOutput } from "../schemas";
import { sign } from "jsonwebtoken";
import config from "../config";
import { logOut} from "../services/endSession";
import { getUserById } from "../services/finder";
import { Role } from "../enum/role";

/**
 * AuthController handles user authentication operations including registration,
 * login, logout, token refresh, password change, and role assignment.
 */
export class AuthController {
    /**
     * Creates an instance of AuthController.
     * @param authModel - Authentication model handling database logic.
     */
    constructor(private readonly authModel: IAuthModel) {}

    /**
     * Handles successful authentication by generating access and refresh tokens,
     * saving the refresh token, and setting cookies.
     * 
     * @private
     * @param user - The authenticated user object.
     * @param res - The HTTP response object.
     * @returns A Promise that resolves when the operation is complete.
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
                sameSite: 'strict',
                maxAge: jwtAccessExpiryMs
            })
            .cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: jwtRefreshExpiryMs
            })
            .status(200)
            .json({ username: user.username, role: user.role });
    }

    /**
     * Registers a new user if the provided data is valid and not already taken.
     * Sends back access and refresh tokens in cookies upon success.
     * 
     * @param req - The HTTP request object containing user registration data.
     * @param res - The HTTP response object.
     * @returns A Promise that resolves when the registration is complete.
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
     * Logs in a user with valid credentials.
     * Sends back access and refresh tokens in cookies upon success.
     * 
     * @param req - The HTTP request object containing login credentials.
     * @param res - The HTTP response object.
     * @returns A Promise that resolves when the login process is complete.
     */
    logIn = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = validateAuth(req.body);

            if (!result.success) {
                res.status(422).json({ errors: result.issues });
                return;
            }

            const user = await this.authModel.logIn(result.output);
            if(!user){
                res.status(401).json({ error: "Invalid email or password"})
                return;
            }
            try {
                await this.handleAuthSuccess(user, res);
            } catch (err) {
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
     * Logs out the user by removing stored tokens and clearing cookies.
     * 
     * @param req - The HTTP request object.
     * @param res - The HTTP response object.
     * @returns A Promise that resolves when the logout process is complete.
     */
    logOut = async (req: Request, res: Response): Promise<void> => {
        try{
            await logOut(req, res, this.authModel);
            res.status(200);
        } catch (e) {
            res.status(500).json({ error: "Internal Error"}); // Error al borrar el token
        }
    }

    /**
     * Refreshes the user's access token using a valid refresh token.
     * If the token is invalid or user is not found, clears cookies.
     * 
     * @param req - The HTTP request object containing the refresh token.
     * @param res - The HTTP response object.
     * @returns A Promise that resolves when a new token is issued.
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
                        sameSite: 'strict'
                    });    
                }

                res.clearCookie('refreshToken', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
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
     * Updates the user's password if the old password is correct.
     * 
     * @param req - The HTTP request object containing old and new passwords.
     * @param res - The HTTP response object.
     * @returns A Promise that resolves when the password is updated.
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
            res.status(200).json({ message: "Password updated successfully" });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
    
    /**
     * Updates a user's role to a new valid role.
     * 
     * @param req - The HTTP request object containing the user ID and new role.
     * @param res - The HTTP response object.
     * @returns A Promise that resolves when the role is successfully changed.
     */
    newRole = async (req: Request, res: Response): Promise<void> => {
        const {id, role} = req.body;
        if(!Object.values(Role).includes(role) || typeof id !== 'string' || id.trim() === ""){
            res.status(422).json({ errors: "Bad request" });
            return;
        }
        try {
            await this.authModel.newRole(id, role)
            res.status(200).json({ message: "Role changed successfully" });
        } catch (e) {
            if (e instanceof Error) {
                res.status(400).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
}


