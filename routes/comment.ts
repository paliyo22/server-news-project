import { Router } from "express"
import type { ICommentModel } from "../interfaces"
import { CommentController } from "../controllers"
import { authenticateToken } from "../middlewares"

export const commentRoutes = ({commentModel}: {commentModel: ICommentModel}): Router => {
    const commentRouter = Router()
    const commentController = new CommentController(commentModel)

    commentRouter.get('/replies/:id', commentController.getReplies)
    
    commentRouter.post('/likes/batch', commentController.getLikes)
    commentRouter.post('/like/:id', authenticateToken, commentController.addLike)
    
    commentRouter.delete('/like/:id', authenticateToken, commentController.deleteLike)

    commentRouter.get('/:id', commentController.getComment)
    commentRouter.post('/:id', authenticateToken, commentController.addComment)
    commentRouter.patch('/:id', authenticateToken, commentController.update)
    commentRouter.delete('/:id', authenticateToken, commentController.deleteComment)

    return commentRouter
} 