import type { CommentOutput } from "../schemas";

/**
 * Interface for handling comment-related operations such as comment creation. 
 * This interface defines the necessary methods for interacting with the comment model.
 * 
 * @interface ICommentModel
 */
export interface ICommentModel {
    getComments(id: string): Promise<CommentOutput[]>
    getReplies(commentId: string): Promise<CommentOutput[]>
    addComment(userId: string, newsId: string, comment: string, parentId?: string): Promise<boolean>
    deleteComment(commentId: string, userId: string): Promise<boolean>
    update(userId: string, commentId: string, comment: string): Promise<boolean> 
    
    getLikes(commentId: string[]): Promise<Map<string,string[]>>
    addLike(userId: string, commentId: string): Promise<boolean>
    deleteLike(userId: string, commentId: string): Promise<boolean>
}