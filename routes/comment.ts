import { Router } from "express"
import type { ICommentModel } from "../interfaces"
import { CommentController } from "../controllers"
import { authenticateToken } from "../middlewares"

/**
 * Creates and returns the comment routes for the Express application.
 *
 * @param {Object} params - The parameters object.
 * @param {ICommentModel} params.commentModel - The comment model instance to be used by the controller.
 * @returns {Router} The configured Express router for comment-related endpoints.
 */
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