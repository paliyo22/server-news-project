import { Router } from "express"
import { NewsController } from "../controllers"
import type { INewsModel } from "../interfaces"
import { authenticateToken, authorizeAdmin } from "../middlewares"

/**
 * Creates and configures the routes related to news management.
 * @param {object} params - Parameters object.
 * @param {INewsModel} params.newsModel - The news model instance.
 * @returns {Router} Configured Express router for news.
 */
export const newsRoutes = ({newsModel}: {newsModel: INewsModel}): Router => {
    const newsRouter = Router();
    const newsController = new NewsController(newsModel);

    newsRouter.get('/', newsController.home);
    newsRouter.get('/featured', newsController.featuredNews);
    newsRouter.get('/inactive', authenticateToken, authorizeAdmin, newsController.getInactive);
    newsRouter.get('/category/:category', newsController.getCategory);
    
    newsRouter.post('/search', newsController.search);
    newsRouter.post('/fetch', authenticateToken, authorizeAdmin, newsController.fetchApi);
    
    newsRouter.delete('/clean', authenticateToken, authorizeAdmin, newsController.clean);

    newsRouter.get('/:id', newsController.getById);
    newsRouter.post('/:id', authenticateToken, authorizeAdmin, newsController.changeStatus);

    return newsRouter;
} 

