import { Router } from "express"
import type { IUserModel, IAuthModel } from "../interfaces"
import { UserController } from "../controllers"
import { authenticateToken, authorizeAdmin } from "../middlewares"

/**
 * Creates and configures the routes related to user management.
 * @param {object} params - Parameters object containing the userModel.
 * @param {IUserModel} params.userModel - The user model instance.
 * @param {object} authParams - Parameters object containing the authModel.
 * @param {IAuthModel} authParams.authModel - The authentication model instance.
 * @returns {Router} Configured Express router for user routes.
 */
export const userRoutes = (
    {userModel}: {userModel: IUserModel}, 
    {authModel}: {authModel: IAuthModel}
): Router => {
    const userRouter = Router();
    const userController = new UserController(userModel, authModel);

    userRouter.get('/me', authenticateToken, userController.getById);
    userRouter.get('/all', authenticateToken, authorizeAdmin, userController.getAll);
    userRouter.patch('/me', authenticateToken, userController.update);
    userRouter.post('/delete', authenticateToken, userController.deleteUser);
    userRouter.delete('/clean', authenticateToken, authorizeAdmin, userController.clean);
   
    userRouter.get('/like/:id', authenticateToken, userController.isLiked);
    userRouter.post('/like/:id', authenticateToken, userController.saveLike);
    userRouter.delete('/like/:id', authenticateToken, userController.deleteLike);
    userRouter.get('/:id', authenticateToken, authorizeAdmin, userController.getById);
    
    return userRouter;
} 
