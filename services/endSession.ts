import type { IAuthModel } from "../interfaces";
import type { Request, Response } from 'express';


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
        res.status(200).json({ message: 'Logged out successfully' });
    }


