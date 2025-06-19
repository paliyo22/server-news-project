import type { IAuthModel } from "../interfaces";
import type { Request, Response } from 'express';

/**
 * Logs out a user by revoking their refresh token and clearing authentication cookies.
 * 
 * This function is responsible for invalidating the user's session by removing the refresh token 
 * from the database and clearing the `accessToken` and `refreshToken` cookies.
 * 
 * @param {Request} req - The Express request object, which contains the user data from the authentication middleware.
 * @param {Response} res - The Express response object, used to send the response back to the client.
 * @param {IAuthModel} authModel - The model responsible for managing authentication-related operations.
 * 
 * @returns {Promise<void>} - A promise that resolves once the logout process is completed.
 * 
 * @throws {Error} - May throw errors if any failure occurs during the token revocation or cookie clearing process.
 */
export const logOut = async (req: Request, res: Response, authModel: IAuthModel): Promise<void> => {
    const oldRefreshToken = (req as any).user

    await authModel.revokeToken(oldRefreshToken.id);
    
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
}


