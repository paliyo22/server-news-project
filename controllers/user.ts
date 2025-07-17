import type { Request, Response } from 'express';
import { validatePartialUser } from '../schemas';
import config from '../config';
import type { IUserModel, IAuthModel } from '../interfaces';
import  { getUserById } from '../services/finder';
import  { logOut } from '../services/endSession';
import { Role } from '../enum/role';

/**
 * Controller responsible for handling user-related HTTP operations.
 * Routes include user profile management, likes on news, and admin cleanup.
 */
export class UserController {

    /**
     * Creates an instance of UserController.
     * 
     * @param {IUserModel} userModel - The user model for DB operations.
     * @param {IAuthModel} authModel - The auth model used for token-based auth and session handling.
     */
    constructor(
        private readonly userModel: IUserModel,
        private readonly authModel: IAuthModel
    ) {}

    /**
     * Retrieves the profile of the authenticated user, or another user if admin.
     * 
     * @route GET /users/ or /users/:id
     * @access Authenticated users, admins for ID-based lookup.
     * 
     * @param {Request} req - Express request object.
     * @param {Response} res - Express response object.
     * @returns {Promise<void>} Sends user data or error.
     */
    getById = async (req: Request, res: Response): Promise<void> => { 
        let id;

        if((req as any).user?.role === Role.ADMIN){
            if(!req.params?.id || typeof req.params?.id !== "string" || req.params?.id.trim() === ""){
                res.status(400).json({ error: 'bad request' });
                return;
            }else{
                id = req.params?.id;
            }
        }else{
            id = (req as any).user?.id;
        }

        try {
            const user = await getUserById(id, this.authModel)
            if(!user){
                res.status(400).json({ error: 'Invalid user'})
            }
            res.status(200).json({ user });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Retrieves a paginated list of all users. Requires admin access.
     * 
     * @route GET /users?limit=&offset=
     * @access Admin only.
     * 
     * @param {Request} req - Express request object, with optional query params.
     * @param {Response} res - Express response object.
     * @returns {Promise<void>} Sends list of users or error.
     */
    getAll = async (req: Request, res: Response): Promise<void> => {
        let limit = parseInt(req.query.limit as string) || 10;
        if(limit<0){
            limit = 10;
        }

        let offset = parseInt(req.query.offset as string) || 0;
        if(offset<0){
            offset = 0;
        }
        try {
            const user = await this.userModel.getAll(limit, offset);
            
            res.status(200).json({ user });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Updates the profile of the authenticated user with partial data.
     * 
     * @route PATCH /users/
     * @access Authenticated users.
     * 
     * @param {Request} req - Express request object with user data in body.
     * @param {Response} res - Express response object.
     * @returns {Promise<void>} Sends updated user or error.
     */
    update = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const result = validatePartialUser(req.body);

        if(!result.success){
            res.status(400).json({ error: result.issues });
            return;
        }
        try {
            const user = await this.userModel.update(token.id, result.output);
            res.status(200).json({ user })
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Deletes all inactive users if the provided password matches the internal admin password.
     * 
     * @route DELETE /users/clean
     * @access Admin only.
     * 
     * @param {Request} req - Express request object, requires password in body.
     * @param {Response} res - Express response object.
     * @returns {Promise<void>} Sends deletion result or error. Logs out on failure.
     */
    clean = async (req: Request, res: Response): Promise<void> => {
        const password = req.body?.password;

        if(!password || typeof password !== 'string' || password.trim() === ''){
            res.status(400).json({ error: 'bad request'});
            return;
        }

        try{
            if(password !== config.Password){
                await logOut(req, res, this.authModel);
                res.status(401).json({ error: 'Verification failed. Your session has been terminated for security reasons.' });
                return;
            }

            const deletedCount = await this.userModel.erase();

            res.status(200).json({ success: true, deleted: deletedCount });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Adds a like to a specific news item from the authenticated user.
     * 
     * @route POST /users/like/:id
     * @access Authenticated users.
     * 
     * @param {Request} req - Express request object with news ID in URL.
     * @param {Response} res - Express response object.
     * @returns {Promise<void>} Sends success status or duplicate error.
     */
    saveLike = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;

        if (!newsId || typeof newsId !== 'string' || newsId.trim() === '') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }

        try {
            const result = await this.userModel.addLike(token.id, newsId);

            if(!result){
                res.status(400).json({ error: 'Already exist' });
                return;
            }

            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Removes a like from a specific news item by the authenticated user.
     * 
     * @route DELETE /users/like/:id
     * @access Authenticated users.
     * 
     * @param {Request} req - Express request object with news ID in URL.
     * @param {Response} res - Express response object.
     * @returns {Promise<void>} Sends success or not found.
     */
    deleteLike = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;

        if (!newsId || typeof newsId !== 'string' || newsId.trim() === '') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }

        try {
            const result = await this.userModel.dislike(token.id, newsId);

            if(!result){
                res.status(404).json({ error: "Like not found" });
                return;
            }

            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Checks if the authenticated user has liked a specific news item.
     * 
     * @route GET /users/like/:id
     * @access Authenticated users.
     * 
     * @param {Request} req - Express request object with news ID in URL.
     * @param {Response} res - Express response object.
     * @returns {Promise<void>} Sends a boolean field `liked`.
     */
    isLiked = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;

        if (!newsId || typeof newsId !== 'string' || newsId.trim() === '') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }

        try {
            const result = await this.userModel.isLiked(token.id, newsId);

            res.status(200).json({ liked: result });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Deactivates the authenticated user's account and logs them out.
     *
     * - Sets the user's `is_active` flag to false.
     * - Deactivates all comments associated with the user.
     * - Revokes the user's refresh token.
     * - Clears the authentication cookies.
     *
     * @param {Request} req - HTTP request object, must include the authenticated user's token.
     * @param {Response} res - HTTP response object.
     * @returns {Promise<void>} Sends a JSON response indicating success or an internal error.
     */
    deleteUser = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        
        try {
            await this.userModel.delete(token.id);
                      
            res.status(200).json({ message: 'The acount was deleted' });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
}

