import type { UserInput, UserOutput } from "../schemas/user";

export interface IUserModel {
    getAll(limit: number, offset: number): Promise<UserOutput[] | null>
    update(id: string, input: Partial<UserInput>): Promise<UserOutput>
    status(id: string): Promise<boolean>
    erase(): Promise<number>
    addLike(userId: string, newsId: string): Promise<boolean>
    addComment(userId: string, newsId: string, comment: string, parentId?: string): Promise<void>
    dislike(userId: string, newsId: string): Promise<boolean>
    deleteComment(commentId: string, userId: string): Promise<boolean>
    isLiked(userId: string, newsId: string): Promise<boolean>
}