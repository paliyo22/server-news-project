import type { ResultSetHeader } from "mysql2";
import { connection } from "../../db/mysql";
import type { ICommentModel } from "../../interfaces";
import { validateCommentOutput, type CommentOutput } from "../../schemas";

export class CommentModel implements ICommentModel {
    /**
     * Retrieves top-level comments for a news item.
     * @param {string} id - UUID of the news item.
     * @returns {Promise<CommentOutput[]>} List of comments.
     * @throws {Error} On validation failure.
     */
    async getComments(id: string): Promise<CommentOutput[]> {

        const [rows] = await connection.query(
            `SELECT BIN_TO_UUID(c.id) AS id, BIN_TO_UUID(c.user_id) AS user_id,
                c.content, c.created, COUNT(l.user_id) AS likes, u.username,
                (SELECT COUNT(*) FROM comment c2 WHERE c2.parent_comment_id = c.id 
                AND c2.is_active = TRUE) AS replies
            FROM comment c
            LEFT JOIN likes_x_comment l ON l.comment_id = c.id
            LEFT JOIN user u ON c.user_id = u.id
            WHERE (c.parent_comment_id IS NULL)
            AND (c.news_id = UUID_TO_BIN(?)) 
            AND (c.is_active IS TRUE)
            GROUP BY c.id;`, [id]
        ) as [any[], any];

        if (rows.length === 0) {
            return [];   
        }
        const comments: CommentOutput[] = rows.map(validateCommentOutput)
                                            .filter(result => result.success)
                                            .map(result => result.output as CommentOutput);
        if(comments.length === 0){
            throw new Error('Error on output validation');
        }
        return comments;
    }

    /**
     * Retrieves child comments for a given comment.
     * @param {string} commentId - UUID of the parent comment.
     * @returns {Promise<CommentOutput[]>} List of child comments.
     * @throws {Error} On validation failure.
     */
    async getReplies(commentId: string): Promise<CommentOutput[]> {
        const [rows] = await connection.query(
            `SELECT BIN_TO_UUID(c.id) AS id, BIN_TO_UUID(c.user_id) AS user_id,
                c.content, c.created, COUNT(l.user_id) AS likes, u.username,
                (SELECT COUNT(*) FROM comment c2 WHERE c2.parent_comment_id = c.id 
                AND c2.is_active = TRUE) AS replies
            FROM comment c
            LEFT JOIN likes_x_comment l ON l.comment_id = c.id
            LEFT JOIN user u ON c.user_id = u.id
            WHERE c.parent_comment_id = UUID_TO_BIN(?)
            GROUP BY c.id
            ORDER BY created;`,[commentId]
        ) as [any[], any];
        if(rows.length === 0){
            return [];
        }
        const comments: CommentOutput[] = rows.map(validateCommentOutput)
                                        .filter(result => result.success)
                                        .map(result => result.output as CommentOutput);
        if(comments.length === 0){
            throw new Error('ERROR EN LA VALIDACION');
        }
        return comments;
    }

    /**
     * Adds a comment to a news item, optionally as a reply to a parent comment.
     * @param {string} userId - ID of the user adding the comment.
     * @param {string} newsId - ID of the news item.
     * @param {string} comment - Content of the comment.
     * @param {string} [parentId] - Optional ID of the parent comment.
     * @returns {Promise<boolean>} - True if insert succeeded, false otherwise.
     */
    async addComment(userId: string, newsId: string, comment: string, parentId?: string): Promise<boolean> {

        const [rows] = await connection.query(
            `INSERT INTO comment (user_id, news_id, parent_comment_id, content)
            VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?);`,
            [userId, newsId, parentId ?? null, comment]
        ) as [ResultSetHeader, any];
        
        if(rows.affectedRows === 0){
            return false;
        }
        
        return true;
    }

    /**
     * Deletes a comment if it belongs to the specified user.
     * @param {string} commentId - ID of the comment to delete.
     * @param {string} userId - ID of the user attempting the deletion.
     * @returns {Promise<boolean>} True if deletion succeeded, false otherwise.
     */
    async deleteComment(commentId: string, userId: string): Promise<boolean> {
        const [rows] = await connection.query(
            `DELETE FROM comment 
            WHERE (user_id = UUID_TO_BIN(?)) AND (id = UUID_TO_BIN(?));`,
            [userId, commentId]
        ) as [ResultSetHeader, any];
        if(rows.affectedRows === 0){
            return false;
        }
        return true;
    }

    /**
     * Adds a like from a user to a specific comment.
     *
     * @param {string} userId - The ID of the user who is liking the comment.
     * @param {string} commentId - The ID of the comment being liked.
     * @returns {Promise<boolean>} - Returns `true` if the like was successfully added, otherwise `false`.
     */
    async addLike(userId: string, commentId: string): Promise<boolean> {
        const [rows] = await connection.query(
            `INSERT INTO likes_x_comment (user_id, comment_id)
            VALUES (?, ?);`, [userId, commentId]
        ) as [ResultSetHeader, any];

        return rows.affectedRows > 0;
    }

    /**
     * Removes a like from a user on a specific comment.
     *
     * @param {string} userId - The ID of the user who previously liked the comment.
     * @param {string} commentId - The ID of the comment being unliked.
     * @returns {Promise<boolean>} - Returns `true` if the like was successfully removed, otherwise `false`.
     */
    async deleteLike(userId: string, commentId: string): Promise<boolean> {
        const [rows] = await connection.query(
            `DELETE FROM likes_x_comment 
            WHERE user_id = ? AND comment_id = ?;`, [userId, commentId]
        ) as [ResultSetHeader, any];
        
        return rows.affectedRows > 0;
    }

    /**
     * Retrieves all likes associated with a list of comment IDs.
     *
     * @param {string[]} commentId - An array of comment IDs to fetch likes for.
     * @returns {Promise<Map<string, string[]>>} - A map where each key is a comment ID, and the value is an array of user IDs who liked that comment.
     */
    async getLikes(commentId: string[]): Promise<Map<string,string[]>> {
        const likesMap = new Map<string, string[]>();

        for (const id of commentId) {
            likesMap.set(id, []);
        }

        const placeholders = commentId.map(() => '?').join(', ');
        const [rows] = await connection.query(
            `SELECT comment_id, user_id
            FROM likes_x_comment
            WHERE comment_id IN (${placeholders});`,
            commentId
        ) as [any[], any];

        for (const row of rows) {
            likesMap.get(row.comment_id)!.push(row.user_id);
        }

        return likesMap;
    }

    /**
     * Updates the content of a comment, only if the user is the owner of the comment.
     *
     * @param {string} userId - The ID of the user attempting to update the comment.
     * @param {string} commentId - The ID of the comment to be updated.
     * @param {string} comment - The new content to replace the existing comment content.
     * @returns {Promise<string>} - Returns the updated comment content.
     * @throws {Error} - Throws an error if the update fails (e.g., the comment does not exist or the user is not authorized).
     */
    async update(userId: string, commentId: string, comment: string): Promise<string> {
        const [rows] = await connection.query(
            `UPDATE comment SET content = ? 
            WHERE id = ? AND user_id = ?;`,[comment, commentId, userId]
        ) as [ResultSetHeader, any];

        if(rows.affectedRows === 0){
            throw new Error('Error updating comment');
        }
        
        return comment;
    }
}