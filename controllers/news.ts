import type { Request, Response } from 'express';
import type { INewsModel } from '../interfaces/INewsModel';
import config from '../config';
import { Category, isCategory } from '../enum/category';
import { apiData, delay } from '../services/apiNews';
import { saveUrlImage } from '../services/saveImageUrl'


export class NewsController {


    constructor(private readonly newsModel: INewsModel) {}
    
    /**
     * Retrieves active news with optional pagination.
     * 
     * @route GET /news
     * @param {Request} req - Express request object (supports `limit` and `offset` query parameters).
     * @param {Response} res - Express response object containing the paginated news.
     * @returns {Promise<void>}
    */
    home = async (req: Request, res: Response): Promise<void> => {
        
        let limit = parseInt(req.query.limit as string) || 10;
        if(limit < 0){
            limit = 10;
        }

        let offset = parseInt(req.query.offset as string) || 0;
        if(offset < 0){
            offset = 0;
        }

        try {
            const news = await this.newsModel.getNews(limit, offset);
            
            res.status(200).json({ news });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Retrieves most liked news in the past month (featured), with optional limit.
     * 
     * @route GET /news/featured
     * @param {Request} req - Express request object (supports optional `limit` query parameter).
     * @param {Response} res - Express response object containing featured news.
     * @returns {Promise<void>}
    */
    featuredNews = async (req: Request, res: Response): Promise<void> => {

            let limit = parseInt(req.query.limit as string) || config.FeaturedLimit;
            if(limit<0){
                limit = config.FeaturedLimit;
            } 

        try {
            const news = await this.newsModel.getFeatured(limit);
            
            res.status(200).json({ news });
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Retrieves a specific news item by ID, including subnews if available.
     * 
     * @route GET /news/:id
     * @param {Request} req - Express request object (expects `id` param).
     * @param {Response} res - Express response object containing the news item and optional subnews.
     * @returns {Promise<void>}
    */
    getById = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;

        if (!id || typeof id !== 'string' || id.trim() === '') {
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }

        try{
            const news = await this.newsModel.getById(id);
                        
            if(news.hasSubnews){
                const subNews = await this.newsModel.getSubnews(id);
                res.status(200).json({news, subNews})
                return;    
            }
            
            res.status(200).json({ news })
        }catch(e){
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
    
    /**
     * Manually fetches and imports news data from external APIs by category.
     * Resolves redirection issues in image URLs and enriches the dataset before saving.
     * 
     * @route POST /news/fetch
     * @access Admin only
     * @param {Request} req - Express request object (no body expected).
     * @param {Response} res - Express response object.
     * @returns {Promise<void>}
    */
    fetchApi = async (req: Request, res: Response): Promise<void> => {
        try{
            let aux = 0;

            for(const category of Object.values(Category)) {
                
                const newsArray = await apiData(category); //service
                const news = await saveUrlImage(newsArray); //service
                await this.newsModel.addNewsList(news, category);
                aux +=  news.items.length;
                await delay(1000);
            }

            res.status(200).json({ succes: `${aux} news successfully save` }) 
        }catch(e){
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Toggles the visibility (active status) of a news item by its ID.
     * 
     * @route PATCH /news/:id/status
     * @param {Request} req - Express request object (expects `id` param).
     * @param {Response} res - Express response object with success or error status.
     * @returns {Promise<void>}
    */
    changeStatus = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;

        if(!id || typeof id !== 'string' || id.trim() === ''){
            res.status(400).json({ error: 'Invalid or missing id parameter' });
            return;
        }

        try {
            const result = await this.newsModel.setStatus(id);

            if(!result){
                res.status(404).json({ error: 'Not found' });
                return;
            }

            res.status(200).json({ success: true });    
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
    
    /**
     * Deletes all inactive news entries from the database.
     * 
     * @route DELETE /news/inactive
     * @param {Request} req - Express request object.
     * @param {Response} res - Express response object with count of deleted entries.
     * @returns {Promise<void>}
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
     * Retrieves paginated list of inactive news entries.
     * 
     * @route GET /news/inactive
     * @param {Request} req - Express request object (supports `limit` and `offset` query parameters).
     * @param {Response} res - Express response object containing paginated inactive news.
     * @returns {Promise<void>}
    */
    getInactive = async(req: Request, res: Response): Promise<void> => {
        let limit = parseInt(req.query.limit as string) || 10;
        let offset = parseInt(req.query.offset as string) || 0;
        
        if(limit<0){
            limit = 10;
        }

        if(offset<0){
            offset = 0;
        }

        try {
            const news = await this.newsModel.getInactive(limit, offset);

            res.status(200).json({ news })
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }

    /**
     * Retrieves active news filtered by category with pagination.
     * 
     * @route GET /news/category/:category
     * @param {Request} req - Express request object (expects `category` param and optional `limit` and `offset` query parameters).
     * @param {Response} res - Express response object containing filtered news by category.
     * @returns {Promise<void>}
    */
    getCategory = async (req: Request, res: Response): Promise<void> => {
        const category = req.params.category;
        let limit = parseInt(req.query.limit as string) || 10;
        let offset = parseInt(req.query.offset as string) || 0;

        if (!category || typeof category !== 'string' || !isCategory(category)) {
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
            
            res.status(200).json({ news })
        } catch (e) {
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }  

}
