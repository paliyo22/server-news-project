import type { AuthInput, UserInput, UserOutput } from "../schemas";
import type { Role } from "../enum";

/**
 * Interface for handling authentication-related operations such as user creation, login, token management, 
 * and role updates. This interface defines the necessary methods for interacting with the authentication model.
 * 
 * @interface IAuthModel
 */
export interface IAuthModel {
    createUser(user: UserInput): Promise<UserOutput | boolean>
    logIn(auth: AuthInput): Promise<UserOutput | null>
    saveToken(id: string, token: string): Promise<void | null>
    getById(id: string, expectedRefreshToken?: string): Promise<UserOutput | null>
    revokeToken(id: string): Promise<void>
    newPassword(id: string, oldPassword: string, newPassword: string): Promise<boolean>
    newRole(id: string, role: Role): Promise<void>
    activate(id: string): Promise<void>
}