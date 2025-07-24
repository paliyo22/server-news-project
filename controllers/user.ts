import type { Request, Response } from 'express';
import { validatePartialUser } from '../schemas';
import config from '../config';
import type { IUserModel, IAuthModel } from '../interfaces';
import  { getUserById, logOut } from '../services';
import { Role } from '../enum';

export class UserController {

    constructor(
        private readonly userModel: IUserModel,
        private readonly authModel: IAuthModel
    ) {}

    getById = async (req: Request, res: Response): Promise<void> => { 
        let id;

        if((req as any).user?.role === Role.ADMIN){
            if(!req.params?.id || typeof req.params?.id !== "string" || req.params?.id.trim() === ""){
                id = (req as any).user?.id
            }else{
                id = req.params?.id;
            }
        }else{
            id = (req as any).user?.id;
        }

        try {
            const user = await getUserById(id, this.authModel)
            if(!user){
                res.status(400).json({ error: 'Invalid user'})
            }
            res.status(200).json({ user });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    getAll = async (req: Request, res: Response): Promise<void> => {
        let limit = parseInt(req.query.limit as string) || 10;
        if(limit<0){
            limit = 10;
        }

        let offset = parseInt(req.query.offset as string) || 0;
        if(offset<0){
            offset = 0;
        }
        try {
            const user = await this.userModel.getAll(limit, offset);
            
            res.status(200).json({ user });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    update = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const result = validatePartialUser(req.body);

        if(!result.success){
            res.status(400).json({ error: result.issues });
            return;
        }
        try {
            const user = await this.userModel.update(token.id, result.output);
            res.status(200).json({ user })
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    clean = async (req: Request, res: Response): Promise<void> => {
        const password = req.body?.password;

        if(!password || typeof password !== 'string' || password.trim() === ''){
            res.status(400).json({ error: 'bad request'});
            return;
        }

        try{
            if(password !== config.Password){
                await logOut(req, res, this.authModel);
                res.status(401).json({ error: 'Verification failed. Your session has been terminated for security reasons.' });
                return;
            }

            const deletedCount = await this.userModel.erase();

            res.status(200).json({ success: true, deleted: deletedCount });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    saveLike = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;

        if (!newsId || typeof newsId !== 'string' || newsId.trim() === '') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }

        try {
            const result = await this.userModel.addLike(token.id, newsId);

            if(!result){
                res.status(400).json({ error: 'Already exist' });
                return;
            }

            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    deleteLike = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;

        if (!newsId || typeof newsId !== 'string' || newsId.trim() === '') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }

        try {
            const result = await this.userModel.dislike(token.id, newsId);

            if(!result){
                res.status(404).json({ error: "Like not found" });
                return;
            }

            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    isLiked = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const newsId = req.params.id;

        if (!newsId || typeof newsId !== 'string' || newsId.trim() === '') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }

        try {
            const result = await this.userModel.isLiked(token.id, newsId);

            res.status(200).json({ liked: result });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    deleteUser = async (req: Request, res: Response): Promise<void> => {
        const token = (req as any).user;
        const id = req.body?.id
        
        try {
            if(id && token.role === Role.ADMIN){
                await this.userModel.delete(id);
            }else{
                await this.userModel.delete(token.id);
            }                      
            res.status(200).json({ message: 'The acount was deleted' });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
}

