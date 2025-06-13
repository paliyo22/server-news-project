import type { Request, Response } from 'express';
import type { INewsModel } from '../interfaces/INewsModel';
import config from '../config';
import { Category, isCategory } from '../enum/category';
import { apiData, delay } from '../services/apiNews';
import { saveUrlImage } from '../services/saveImageUrl'


export class NewsController {
    constructor(private readonly newsModel: INewsModel) {}
    
    // retorna solo news visibles
    home = async (req: Request, res: Response): Promise<void> => {
        
        let limit = parseInt(req.query.limit as string) || 10;
        if(limit<0){
            limit = 10;
        }

        let offset = parseInt(req.query.offset as string) || 0;
        if(offset<0){
            offset = 0;
        }

        try {
            const news = await this.newsModel.getNews(limit, offset);
            if(news === null){
                res.status(404).json({ error: 'No featured news found' });    
                return;
            }
            res.status(200).json(news)
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    featuredNews = async (req: Request, res: Response): Promise<void> => {
        try {
            let limit = parseInt(req.query.limit as string) || config.FeaturedLimit;
            if(limit<0){
                limit = config.FeaturedLimit;
            } 
            const news = await this.newsModel.featuredNews(limit);
            
            if(news === null){
                res.status(404).json({ error: 'No featured news found' });    
                return;
            }
            res.status(200).json(news)
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    getById = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;
        if (typeof id !== 'string') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }
        try{
            const news = await this.newsModel.getById(id);
            if(news === null){
                res.status(404).json({ error: 'No featured news found' });    
                return;
            }
            
            if(news.hasSubnews){
                const subNews = await this.newsModel.getSubnews(id);
                res.status(200).json({news, subNews})
                return;    
            }
            
            res.status(200).json({news})
        }catch(e){
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
    
    getNewsComment = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;
        if (typeof id !== 'string') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }
        try {
            const comments = await this.newsModel.getComments(id);
            res.status(200).json(comments);
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    fetchApi = async (req: Request, res: Response): Promise<void> => {
        try{
            let aux = 0;
            for(const category of Object.values(Category)) {
                
                const newsArray = await apiData(category); //service
                const news = await saveUrlImage(newsArray); //service
                await this.newsModel.saveNews(news, category);
                aux +=  news.items.length;
                await delay(1000);
            }
            res.status(200).json({ succes: `✅ ${aux} noticias procesadas con exito.`}) 
        }catch(e){
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    changeStatus = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id
        if(typeof id !== 'string'){
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }
        try {
            const result = await this.newsModel.status(id);
            if(!result){
                res.status(404).json({ error: 'Not found' });
                return;
            }
            res.status(200).end();
            
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    clean = async (req: Request, res: Response): Promise<void> => {
        try {
            const deletedCount = await this.newsModel.clean();
            res.status(200).json({ success: true, deleted: deletedCount });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
   
    inactive = async(req: Request, res: Response): Promise<void> => {
        let limit = parseInt(req.query.limit as string) || 10;
        if(limit<0){
            limit = 10;
        }

        let offset = parseInt(req.query.offset as string) || 0;
        if(offset<0){
            offset = 0;
        }

        try {
            const news = await this.newsModel.getInactive(limit, offset);
            if(news === null){
                res.status(404).json({ error: 'No featured news found' });    
                return;
            }
            res.status(200).json(news)
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
    
    replies = async (req: Request, res: Response): Promise<void> => {
        const commentId = req.params.id;
        try{
            if(!commentId || typeof commentId !== 'string' || commentId.trim() === ''){
                res.status(400).json({ error: 'bad request' });
                return;
            }
            const result = await this.newsModel.getChildComments(commentId);
            if(!result){
                res.status(404).json({ error: 'No featured comments found' });    
                return;
            }
            res.status(200).json(result);
        }catch(e){
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }   
    }

    getCategory = async (req: Request, res: Response): Promise<void> => {
        const category = req.params.category;
        let limit = parseInt(req.query.limit as string) || 10;
        let offset = parseInt(req.query.offset as string) || 0;

        if (typeof category !== 'string' || !isCategory(category)) {
            res.status(400).json({ error: 'Invalid or missing category parameter' });
            return;
        }
        if(limit<0){
            limit = 10;
        }      
        if(offset<0){
            offset = 0;
        }

        try {
            const news = await this.newsModel.getByCategory(limit, offset, category);
            if(news === null){
                res.status(404).json({ error: 'No featured news found' });    
                return;
            }
            res.status(200).json(news)
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }    
}
