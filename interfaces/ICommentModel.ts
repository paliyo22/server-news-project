import type { CommentOutput } from "../schemas";


export interface ICommentModel {
    getComments(id: string): Promise<CommentOutput[]>
    getReplies(commentId: string): Promise<CommentOutput[]>
    addComment(userId: string, newsId: string, comment: string, parentId?: string): Promise<boolean>
    deleteComment(commentId: string, userId: string): Promise<boolean>
    update(userId: string, commentId: string, comment: string): Promise<string> 
    
    getLikes(commentId: string[]): Promise<Map<string,string[]>>
    addLike(userId: string, commentId: string): Promise<boolean>
    deleteLike(userId: string, commentId: string): Promise<boolean>
}