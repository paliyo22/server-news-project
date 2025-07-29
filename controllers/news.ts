import type { Request, Response } from 'express';
import type { IAuthModel, INewsModel } from '../interfaces';
import config from '../config';
import { Category, isCategory } from '../enum';
import { apiData, delay, logOut, saveUrlImage } from '../services';

/**
 * Controller for handling news-related operations such as retrieving, searching, updating,
 * and importing news articles.
 *
 * @class NewsController
 * @param {INewsModel} newsModel - The news model instance used for data operations.
 */
export class NewsController {

    /**
     * Creates an instance of NewsController.
     * @param {INewsModel} newsModel - The news model instance.
     * @param {IAuthModel} authModel - The authentication model instance.
     */
    constructor(
        private readonly newsModel: INewsModel,
        private readonly authModel: IAuthModel
    ) {}
    
    /**
     * Retrieves a paginated list of news articles.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
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
     * Retrieves a list of featured news articles from the last month, ordered by likes.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
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
     * Retrieves a news article by its ID, including subnews if available.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
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
     * Fetches news articles from an external API for all categories and saves them to the database.
     * Also updates the fetch date and handles rate limiting.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    fetchApi = async (req: Request, res: Response): Promise<void> => {
        try{
            let aux = 0;
            await this.newsModel.checkFetchDate(); //se puede mejorar ya que no es 500
            for(const category of Object.values(Category)) {
                
                const newsArray = await apiData(category); //service
                const news = await saveUrlImage(newsArray); //service
                await this.newsModel.addNewsList(news, category);
                aux +=  news.items.length;
                await delay(1000);
            }
            await this.newsModel.updateFetchDate();
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
     * Toggles the active status of a news article by its ID.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
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
     * Deletes all inactive news articles after verifying the provided password.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    clean = async (req: Request, res: Response): Promise<void> => {
        const password = req.body?.password;

        if(!password || typeof password !== 'string' || password.trim() === ''){
            res.status(400).json({ error: 'bad request'});
            return;
        }
        try {
            if(password !== config.Password){
                await logOut(req, res, this.authModel);
                res.status(401).json({ error: 'Verification failed.' });
                return;
            }
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
     * Retrieves a paginated list of inactive news articles.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
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
     * Retrieves a paginated list of news articles by category.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
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

    /**
     * Searches for news articles whose title contains the given string.
     * @function
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    search = async (req: Request, res: Response): Promise<void> => {
        const contain = req.body.contain;

        if (!contain || typeof contain !== 'string' || contain.trim() === ''){
            res.status(400).json({ error: 'Invalid or missing body in request' });
            return;
        }
        try{
            const news = await this.newsModel.search(contain);
            res.status(200).json({ news });
        }catch(e){
            if (e instanceof Error) {
                res.status(500).json({ error: e.message });
            } else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
}
