import type { Request, Response } from 'express';
import { validatePartialUser } from '../schemas';
import config from '../config';
import type { IUserModel, IAuthModel } from '../interfaces';
import  { getUserById } from '../services/finder';
import  { logOut } from '../services/endSession';
import { Role } from '../enum/role';

/**
 * UserController handles user-related actions such as retrieving user information,
 * updating user details, managing likes and comments, and deleting accounts.
 */
export class UserController {

    /**
     * Creates an instance of UserController.
     * @param userModel - A data access layer implementing the IUserModel interface.
     * @param authModel - A data access layer implementing the IAuthModel interface.
     */
    constructor(
        private readonly userModel: IUserModel,
        private readonly authModel: IAuthModel
    ) {}

    /**
     * Retrieves a user by their ID. Admins can fetch any user, while other users
     * can only access their own data.
     * 
     * @param req - HTTP request object containing the `id` param.
     * @param res - HTTP response object to send the result.
     */
    getById = async (req: Request, res: Response): Promise<void> => { 
        let id;

        if((req as any).user?.role === Role.ADMIN){
            if(typeof req.params?.id !== "string" || req.params?.id.trim() === ""){
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
            if (!user) {
                res.status(404).json({ error: 'user not found' });
                return;
            }
            res.status(200).json(user);
        } catch (e) {
            res.status(500).json({ error: 'error connecting to database' });
        }
    }

    /**
     * Retrieves a list of users with optional pagination.
     * 
     * @param req - HTTP request object with optional `limit` and `offset` query params.
     * @param res - HTTP response object to send the result.
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
            if(!user){
                res.status(401).json({ error: "Not Founded" });
            }
            res.status(200).json(user)
        } catch (e) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Updates a user's data. Only authorized users can update their own data.
     * 
     * @param req - HTTP request object containing the body data to update the user.
     * @param res - HTTP response object with the updated user data.
     */
    update = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const result = validatePartialUser(req.body);

        if(!result.success){
            res.status(400).json({ error: 'bad request'});
            return;
        }
        try {
            const user = await this.userModel.update(token.id, result.output);
            res.status(200).json(user)
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

     /**
     * Changes the status of the user account (e.g., deactivate or reactivate).
     * 
     * @param req - HTTP request object containing the user info.
     * @param res - HTTP response object to send the result.
     */
    changeStatus = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        
        try {
            const result = await this.userModel.status(token.id);
            if(!result){
                await logOut(req, res, this.authModel);
                res.status(200).json({ message: 'The acount is deleted' })
                return;
            }            
            res.status(200).json({ message: 'Welcome back' });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Cleans up users data based on a security password verification.
     * 
     * @param req - HTTP request object containing the password.
     * @param res - HTTP response object to send the result.
     */
    clean = async (req: Request, res: Response): Promise<void> => {
        const password = req.body?.password
        try{
            if(password !== config.Password){
                await logOut(req, res, this.authModel)
                res.status(401).json({ error: 'Verification failed. Your session has been terminated for security reasons.' })
                return;
            }
            const deletedCount = await this.userModel.erase();
            res.status(200).json({ success: true, deleted: deletedCount })
        } catch (e) {
            res.status(500).json({ error: "Internal Server Error" });
            
        }
    }

    /**
     * Saves a like for a specific news article by the authenticated user.
     * 
     * @param req - HTTP request object containing the `id` param (newsId).
     * @param res - HTTP response object indicating success or failure.
     */
    saveLike = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;
        if (typeof newsId !== 'string') {
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
     * Saves a comment for a specific news article by the authenticated user.
     * Optionally, a parent comment ID can be provided to create a reply.
     * 
     * @param req - HTTP request object containing the `id` param (newsId) and comment body.
     * @param res - HTTP response object indicating success or failure.
     */
    saveComment = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;
        const { comment, parentCommentId } = req.body;

        console.log("aca llega")
        if(typeof comment !== "string" || comment.trim() === ""){
                res.status(400).json({ error: 'Bad request' });
                return;
        }
        if (typeof newsId !== 'string') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }
        
        try {
            if(!parentCommentId || typeof parentCommentId !== "string" || parentCommentId.trim() === ""){
                console.log("aca entra")
                await this.userModel.addComment(token.id, newsId, comment);
            }else{
                await this.userModel.addComment(token.id, newsId, comment, parentCommentId);
            }
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Deletes a like from a specific news article by the authenticated user.
     * 
     * @param req - HTTP request object containing the `id` param (newsId).
     * @param res - HTTP response object indicating success or failure.
     */
    deleteLike = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;
        if (typeof newsId !== 'string') {
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
     * Deletes a comment by its ID. Only the author of the comment or an admin can delete it.
     * 
     * @param req - HTTP request object containing the `id` param (commentId).
     * @param res - HTTP response object indicating success or failure.
     */
    deleteComment = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const commentId = req.params.id;

        if (typeof commentId !== 'string') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }
        try {
            const result = await this.userModel.deleteComment(commentId, token.id);
            if(!result){
                res.status(404).json({ error: "Comment not found or without authorization" });
                return;
            }
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    
    /**
     * Checks if a user has liked a specific news article.
     * 
     * @param req - HTTP request object containing the `id` param (newsId).
     * @param res - HTTP response object with a boolean result indicating whether the news has been liked.
     */
    isLiked = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;

        if (typeof newsId !== 'string') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }
        try {
            const result = await this.userModel.isLiked(token.id, newsId);
            res.status(200).json({ result });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

