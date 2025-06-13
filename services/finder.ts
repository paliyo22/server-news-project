import type { IAuthModel } from "../interfaces";
import type { UserOutput } from "../schemas";


export const getUserById = async (id: string, authModel: IAuthModel, expectedRefreshToken?: string): Promise<UserOutput | null> => {
    return await authModel.getById(id, expectedRefreshToken);
}

