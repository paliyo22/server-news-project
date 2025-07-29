import type { ICommentModel } from "../interfaces";
import type { Request, Response } from 'express';

/**
 * Controller for handling comment-related operations such as retrieving, adding, updating,
 * deleting comments, and managing likes and replies.
 *
 * @class CommentController
 * @param {ICommentModel} commentModel - The comment model instance used for data operations.
 */
export class CommentController {

    /**
     * Creates an instance of CommentController.
     * @param {ICommentModel} commentModel - The comment model instance.
     */
    constructor(private readonly commentModel: ICommentModel){}

    /**
     * Retrieves comments for a specific news item.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    getComment = async (req: Request, res: Response): Promise<void> => {

        const id = req.params.id;

        if (!id || typeof id !== 'string' || id.trim() === '') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }

        try {
            const comments = await this.commentModel.getComments(id);
            res.status(200).json({comments});
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Retrieves replies for a specific comment.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    getReplies = async (req: Request, res: Response): Promise<void> => {

        const commentId = req.params.id;

        try{
            if(!commentId || typeof commentId !== 'string' || commentId.trim() === ''){
                res.status(400).json({ error: 'Bad request' });
                return;
            }

            const comment = await this.commentModel.getReplies(commentId);
            if(comment.length === 0){
                res.status(404).json({ error: 'No featured comments found' });    
                return;
            }

            res.status(200).json({ comment });
        }catch(e){
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }   
    }

    /**
     * Adds a new comment or reply to a news item.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    addComment = async (req: Request, res: Response): Promise<void> => {

        const token = (req as any).user;
        const newsId = req.params.id;
        const { comment, parentCommentId } = req.body;

        if(!comment || typeof comment !== "string" || comment.trim() === "" 
            || !newsId || typeof newsId !== 'string' || newsId.trim() === ""){
            
            res.status(400).json({ error: 'Bad request' });
            return;
        }
               
        try {
            let result;
            if(!parentCommentId){
                result = await this.commentModel.addComment(token.id, newsId, comment);
            }else{
                result = await this.commentModel.addComment(token.id, newsId, comment, parentCommentId);
            }
            if(!result){
                res.status(502).json({ error: "Error saving comment"});
                return;
            }
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Deletes a comment if it belongs to the authenticated user.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    deleteComment = async (req: Request, res: Response): Promise<void> => {

        const token = (req as any).user;
        const commentId = req.params.id;

        if (!commentId || typeof commentId !== 'string' || commentId.trim() === '') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }
        try {
            const result = await this.commentModel.deleteComment(commentId, token.id);
            if(!result){
                res.status(404).json({ error: "Comment not found" });
                return;
            }
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Updates the content of a comment if it belongs to the authenticated user.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    update = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const commentId = req.params.id;
        const comment = req.body.comment;

        if(!comment || typeof comment !== 'string' || comment.trim() === ''
            || !commentId || typeof commentId !== 'string' || commentId.trim() === ''){

            res.status(400).json({ error: 'Bad request' });
            return;
        }
        
        try {
            const result = await this.commentModel.update(token.id, commentId, comment);
            if(!result){
                res.status(404).json({ error: "Comment not found" });
                return;
            }
            res.status(200).json({ success: true });             
        } catch (e) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Adds a like to a comment by the authenticated user.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    addLike = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const commentId = req.params.id;
        
        if(!commentId || typeof commentId !== 'string' || commentId.trim() === ''){
            res.status(400).json({ error: 'Bad request' });
            return;
        }
        
        try {
            const result = await this.commentModel.addLike(token.id, commentId);
            if(!result){
                res.status(502).json({ error: "Error saving comment"});
                return;
            }
            res.status(200).json({ success: true});
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Removes a like from a comment by the authenticated user.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    deleteLike = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const commentId = req.params.id;
        
        if(!commentId || typeof commentId !== 'string' || commentId.trim() === ''){
            res.status(400).json({ error: 'Bad request' });
            return;
        }
        
        try {
            const result = await this.commentModel.deleteLike(token.id, commentId);
            if(!result){
                res.status(404).json({ error: "Like not found"});
                return;
            }
            res.status(200).json({ success: true});
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Retrieves likes for a batch of comments.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    getLikes = async (req: Request, res: Response): Promise<void> => {
        const comments: string[] = req.body.comments;
        
        if(!Array.isArray(comments) || comments.some(c => typeof c !== 'string' || c.trim() === '')){
            res.status(400).json({ error: 'Bad request' });
            return;
        }
        if(comments.length === 0){
            res.status(200).json({ success: 'No comments' });
            return;
        }
        
        try {
            const result = await this.commentModel.getLikes(comments);

            res.status(200).json(Object.fromEntries(result));
        } catch (e) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
}