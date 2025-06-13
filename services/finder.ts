import type { IAuthModel } from "../interfaces";
import type { UserOutput } from "../schemas";

/**
 * Fetches a user by their ID from the authentication model.
 * 
 * This function retrieves the user's details using the provided user ID. Optionally, 
 * you can provide an expected refresh token to validate the user’s session during the process.
 * 
 * @param {string} id - The ID of the user to fetch from the database.
 * @param {IAuthModel} authModel - The authentication model that handles user-related operations.
 * @param {string} [expectedRefreshToken] - An optional expected refresh token to validate the user's session.
 * 
 * @returns {Promise<UserOutput | null>} - A promise that resolves to the user's details if found, or null if the user doesn't exist.
 * 
 * @throws {Error} - May throw errors if there's a failure in fetching the user data from the authentication model.
 */
export const getUserById = async (id: string, authModel: IAuthModel, expectedRefreshToken?: string): Promise<UserOutput | null> => {
    return await authModel.getById(id, expectedRefreshToken);
}

