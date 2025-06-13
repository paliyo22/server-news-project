import type { ResultSetHeader } from "mysql2";
import { connection } from "../../db/mysql";
import type { IUserModel } from "../../interfaces/IUserModel";
import { validateUserOutput, type UserInput, type UserOutput } from "../../schemas/user";

export class UserModel implements IUserModel{

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
   * Removes a like from a news item by the specified user.
   * @param {string} userId - ID of the user.
   * @param {string} newsId - ID of the news item.
   * @returns {Promise<boolean>} True if dislike (removal) succeeded, false otherwise.
   */
  async dislike(userId: string, newsId: string): Promise<boolean> {
    const [rows] = await connection.query(
      `DELETE FROM likes_x_news 
      WHERE (user_id = UUID_TO_BIN(?)) AND (news_id = UUID_TO_BIN(?));`,
      [userId, newsId]
    ) as [ResultSetHeader, any];
    if(rows.affectedRows === 0){
      return false;
    }
    return true;
  }

  /**
   * Adds a comment to a news item, optionally as a reply to a parent comment.
   * @param {string} userId - ID of the user adding the comment.
   * @param {string} newsId - ID of the news item.
   * @param {string} comment - Content of the comment.
   * @param {string} [parentId] - Optional ID of the parent comment.
   */
  async addComment(userId: string, newsId: string, comment: string, parentId?: string): Promise<void> {
    
    await connection.query(
      `INSERT INTO comment (user_id, news_id, parent_comment_id, content)
      VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?);`,
      [userId, newsId, parentId ?? null, comment]
    ) 
    
  }

  /**
   * Adds a like from a user to a news item.
   * @param {string} userId - ID of the user.
   * @param {string} newsId - ID of the news item.
   * @returns {Promise<boolean>} True if like was added, false if it already existed.
   * @throws Throws error if query fails with unexpected error.
   */
  async addLike(userId: string, newsId: string): Promise<boolean> {
    try{
      await connection.query(
        `INSERT INTO likes_x_news (user_id, news_id)
        VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?));`,[userId, newsId]
      ) 
      return true;
    }catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
            return false; 
        }
        throw err; 
    }
  }
  
  /**
   * Deletes all inactive users.
   * @returns {Promise<number>} Number of users deleted.
   */
  async erase(): Promise<number> {
    const [rows] = await connection.query(
      `DELETE FROM user WHERE is_active = false;`
    ) as [ResultSetHeader, any];
    return rows.affectedRows;
  }

  /**
   * Updates specified fields of a user.
   * @param {string} id - ID of the user to update.
   * @param {Partial<UserInput>} input - Partial object containing fields to update.
   * @returns {Promise<UserOutput>} Updated user data.
   * @throws Throws error if no fields provided or validation fails.
   */
  async update(id: string, input: Partial<UserInput>): Promise<UserOutput> {
    if (Object.keys(input).length === 0) {
        throw new Error('No fields provided for update.');
    }

    const fieldMap: Record<string, string> = {
        name: 'user_name',
        lastname: 'lastname',
        birthday: 'birthday',
        username: 'username',
        email: 'email',
        subscription: 'subscription',
        is_active: 'is_active',
        created: 'created',
        refresh_token: 'refresh_token'
    };

    const fields = Object.entries(input)
        .filter(([key, value]) => value !== undefined)
        .map(([key, value]) => [fieldMap[key], value] as [string, any]);

    if (fields.length === 0) {
        throw new Error('No valid fields to update.');
    }
    
    const setClauses = fields.map(([col], i) => `\`${col}\` = ?`).join(', ');
    const values = fields.map(([, val]) => val);

    const sql = `UPDATE user SET ${setClauses} WHERE id = UUID_TO_BIN(?);`;

    await connection.query(sql, [...values, id]);

    const [rows] = await connection.query(
        `SELECT BIN_TO_UUID(u.id) AS id, u.user_name AS name, u.lastname, u.birthday, u.username,
          u.email, u.subscription, r.name AS role, u.is_active,
          u.created, u.refresh_token
        FROM user u 
        LEFT JOIN role r on r.id = u.user_role 
        WHERE u.id = UUID_TO_BIN(?);`,
        [id]
    ) as [any[], any];

    const result = validateUserOutput(rows[0]);
    if(!result.success){
      throw new Error("Internal validation error");
    } 
    return result.output as UserOutput
  }

  /**
   * Retrieves a paginated list of all users.
   * @param {number} limit - Maximum number of users to retrieve.
   * @param {number} offset - Number of users to skip.
   * @returns {Promise<UserOutput[] | null>} Array of users or null if none found.
   */
  async getAll(limit: number, offset: number): Promise<UserOutput[] | null> {
    const [rows] = await connection.query(`
      SELECT BIN_TO_UUID(u.id) AS id, u.user_name AS name, u.lastname, u.birthday, u.username,
      u.email, u.password, u.subscription, r.name AS role, u.is_active,
      u.created
      FROM user u
      LEFT JOIN role r on r.id = u.user_role
      ORDER BY u.lastname, u.user_name 
      LIMIT ? OFFSET ?;`,[limit, offset]
      ) as [any[], any];
      if(rows.length === 0) return null;

      const users = rows.map(validateUserOutput)
        .filter(result => result.success)
        .map(result => result.output as UserOutput);
 
    return users;
  }
  
  /**
   * Toggles the active status of a user.
   * @param {string} id - ID of the user.
   * @returns {Promise<boolean>} New active status (true = active, false = inactive).
   */
  async status(id: string): Promise<boolean> {
    await connection.query(
        `UPDATE user SET is_active = (NOT is_active) WHERE id = UUID_TO_BIN(?);`, [id]
    ) as [ResultSetHeader, any];
    const [result] = await connection.query(
        `SELECT is_active FROM user WHERE id = UUID_TO_BIN(?);`, [id]
    ) as [any[], any];
    if (result[0].is_active === 0) {
        return false;
    }
    return true;
  }
  
  /**
   * Checks if a user has liked a specific news item.
   * @param {string} userId - ID of the user.
   * @param {string} newsId - ID of the news item.
   * @returns {Promise<boolean>} True if user liked the news, false otherwise.
   * @throws Throws error if query fails.
   */
  async isLiked(userId: string, newsId: string): Promise<boolean> {
    try{
      const [result] = await connection.query(
        `SELECT * 
        FROM likes_x_news 
        WHERE user_id = UUID_TO_BIN(?) AND news_id = UUID_TO_BIN(?);`,[userId, newsId]
      ) as [any[], any]
      if(result.length === 0){
        return false
      }
      return true;
    }catch (err: any) {
        throw err; 
    }
  }
  
}


