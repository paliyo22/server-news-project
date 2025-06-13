import type { AuthInput, UserInput, UserOutput } from "../schemas";
import type { Role } from "../enum/role";

export interface IAuthModel {
    createUser(user: UserInput): Promise<UserOutput | boolean>
    logIn(auth: AuthInput): Promise<UserOutput | null>
    saveToken(id: string, token: string): Promise<void | null>
    getById(id: string, expectedRefreshToken?: string): Promise<UserOutput | null>
    revokeToken(id: string): Promise<void>
    newPassword(id: string, oldPassword: string, newPassword: string): Promise<boolean>
    newRole(id: string, role: Role): Promise<void>
}