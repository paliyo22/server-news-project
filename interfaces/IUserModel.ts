import type { UserInput, UserOutput } from "../schemas/user";

/**
 * Interface for managing user-related operations including updating user details, 
 * adding and removing likes, comments, and handling the user's status.
 * 
 * @interface IUserModel
 */
export interface IUserModel {
    getAll(limit: number, offset: number): Promise<UserOutput[]>
    update(id: string, input: Partial<UserInput>): Promise<UserOutput>
    delete(id: string): Promise<void>
    erase(): Promise<number>
    addLike(userId: string, newsId: string): Promise<boolean>
    dislike(userId: string, newsId: string): Promise<boolean>
    isLiked(userId: string, newsId: string): Promise<boolean>
}