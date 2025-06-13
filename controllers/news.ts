import type { Request, Response } from 'express';
import type { INewsModel } from '../interfaces/INewsModel';
import config from '../config';
import { Category, isCategory } from '../enum/category';
import { apiData, delay } from '../services/apiNews';
import { saveUrlImage } from '../services/saveImageUrl'

/**
 * NewsController handles operations related to news articles, including fetching,
 * filtering, updating visibility status, loading external news, and managing comments.
 */
export class NewsController {

    /**
     * Creates an instance of NewsController.
     * @param newsModel - A data access layer implementing the INewsModel interface.
     */
    constructor(private readonly newsModel: INewsModel) {}
    
    /**
     * Returns visible (active) news with optional pagination.
     * 
     * @param req - HTTP request object with optional `limit` and `offset` query params.
     * @param res - HTTP response object to send the result.
     */
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

    /**
     * Returns a list of featured news with an optional limit.
     * 
     * @param req - HTTP request object with optional `limit` query param.
     * @param res - HTTP response object to send the result.
     */
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

    /**
     * Fetches a single news item by its ID. If it has sub-news, returns them as well.
     * 
     * @param req - HTTP request object containing the `id` param.
     * @param res - HTTP response object to send the result.
     */
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
    
    /**
     * Retrieves all comments associated with a specific news article.
     * 
     * @param req - HTTP request object containing the `id` param.
     * @param res - HTTP response object to send the result.
     */
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

    /**
     * Fetches and saves news from an external API source by category.
     * Includes delay between requests and tracks total processed items.
     * 
     * @param req - HTTP request object.
     * @param res - HTTP response object to send the result.
     */
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

    /**
     * Toggles the visibility status of a news item by its ID.
     * 
     * @param req - HTTP request object containing the `id` param.
     * @param res - HTTP response object.
     */
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

    
    /**
     * Deletes inactive news items from the database.
     * 
     * @param req - HTTP request object.
     * @param res - HTTP response object with count of deleted items.
     */
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
   
    /**
     * Retrieves a list of inactive (not visible) news items with pagination.
     * 
     * @param req - HTTP request object with optional `limit` and `offset` query params.
     * @param res - HTTP response object to send the result.
     */
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
    
    /**
     * Gets replies (child comments) for a given parent comment ID.
     * 
     * @param req - HTTP request object containing the `id` param (comment ID).
     * @param res - HTTP response object with list of replies.
     */
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

    /**
     * Fetches news by category with pagination support.
     * 
     * @param req - HTTP request object containing the `category` param, and optional `limit` and `offset` query params.
     * @param res - HTTP response object to send the result.
     */
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
