import { Router } from "express"
import type { IAuthModel } from "../interfaces"
import { AuthController } from "../controllers"
import { authenticateToken, authorizeAdmin, refreshToken } from "../middlewares"


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
