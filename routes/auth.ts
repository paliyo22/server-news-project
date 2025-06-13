import { Router } from "express"
import type { IAuthModel } from "../interfaces"
import { AuthController } from "../controllers"
import { authenticateToken, authorizeAdmin, refreshToken } from "../middlewares"

/**
 * Creates and configures the authentication-related routes.
 * @param {object} params - Parameters object.
 * @param {IAuthModel} params.authModel - The authentication model instance.
 * @returns {Router} Configured Express router for authentication.
 */
export const authRoutes = ({authModel}: {authModel: IAuthModel}): Router => {
    const authRouter = Router()
    const authCotroller = new AuthController(authModel)

    authRouter.post('/register', authCotroller.register)
    authRouter.post('/login', authCotroller.logIn)
    authRouter.post('/logout', refreshToken, authCotroller.logOut)
    authRouter.post('/refresh', refreshToken, authCotroller.refresh)
    authRouter.post('/password', authenticateToken, authCotroller.newPassword)
    authRouter.post('/role', authenticateToken, authorizeAdmin, authCotroller.newRole)
   
    return authRouter
}
