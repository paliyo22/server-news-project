import { Router } from "express"
import { NewsController } from "../controllers/news"
import type { INewsModel } from "../interfaces/INewsModel"
import { authenticateToken, authorizeAdmin } from "../middlewares"


export const newsRoutes = ({newsModel}: {newsModel: INewsModel}): Router => {
    const newsRouter = Router()
    const newsController = new NewsController(newsModel)

    newsRouter.get('/', newsController.home)
    newsRouter.get('/featured', newsController.featuredNews)
    newsRouter.delete('/clean', authenticateToken, authorizeAdmin, newsController.clean)
    newsRouter.post('/fetch', newsController.fetchApi)
    newsRouter.get('/inactive', authenticateToken, authorizeAdmin, newsController.inactive)
    newsRouter.get('/newsComment/:id', newsController.getNewsComment)
    newsRouter.get('/replies/:id', newsController.replies)
    newsRouter.get('/category/:category', newsController.getCategory)
    newsRouter.get('/:id', newsController.getById)
    newsRouter.post('/:id', authenticateToken, authorizeAdmin, newsController.changeStatus)
    return newsRouter
} 

