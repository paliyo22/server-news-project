import type { ICommentModel } from "../interfaces";
import type { Request, Response } from 'express';

export class CommentController {

    constructor(private readonly commentModel: ICommentModel){}

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