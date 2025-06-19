import type { ResultSetHeader } from "mysql2";
import { connection } from "../../db/mysql";
import type { IUserModel } from "../../interfaces/IUserModel";
import { validateUserOutput, type UserInput, type UserOutput } from "../../schemas/user";

export class UserModel implements IUserModel{

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

    return rows.affectedRows > 0;
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
          u.created
        FROM user u 
        LEFT JOIN role r on r.id = u.user_role 
        WHERE u.id = UUID_TO_BIN(?);`,[id]
    ) as [any[], any];

    const result = validateUserOutput(rows[0]);
    if(!result.success){
      throw new Error("Internal validation error");
    } 
    return result.output;
  }

  /**
   * Retrieves a paginated list of all users.
   * @param {number} limit - Maximum number of users to retrieve.
   * @param {number} offset - Number of users to skip.
   * @returns {Promise<UserOutput[]>} Array of users or null if none found.
   */
  async getAll(limit: number, offset: number): Promise<UserOutput[]> {
    const [rows] = await connection.query(`
      SELECT BIN_TO_UUID(u.id) AS id, u.user_name AS name, u.lastname, u.birthday, u.username,
      u.email, u.password, u.subscription, r.name AS role, u.is_active,
      u.created
      FROM user u
      LEFT JOIN role r on r.id = u.user_role
      ORDER BY u.lastname, u.user_name 
      LIMIT ? OFFSET ?;`,[limit, offset]
      ) as [any[], any];
      if(rows.length === 0){
        throw new Error('Internal query error');
      }

      const users = rows.map(validateUserOutput)
        .filter(result => result.success)
        .map(result => result.output as UserOutput);
 
    return users;
  }
  
  /**
   * Checks if a user has liked a specific news item.
   * @param {string} userId - ID of the user.
   * @param {string} newsId - ID of the news item.
   * @returns {Promise<boolean>} True if user liked the news, false otherwise.
   * @throws Throws error if query fails.
   */
  async isLiked(userId: string, newsId: string): Promise<boolean> {
    const [result] = await connection.query(
      `SELECT * 
      FROM likes_x_news 
      WHERE user_id = UUID_TO_BIN(?) AND news_id = UUID_TO_BIN(?);`,[userId, newsId]
    ) as [any[], any]

    if(result.length === 0){
      return false
    }

    return true;
  }

  /**
   * Deactivates a user account and all their associated comments.
   *
   * - Sets the `is_active` field of the specified user to `false`.
   * - Also sets `is_active` to `false` for all comments made by the user.
   * - Throws an error if the user does not exist.
   *
   * @param {string} id - The UUID of the user to deactivate.
   * @returns {Promise<void>} Resolves when the operation completes.
   * @throws {Error} If no user was found with the provided ID.
   */
  async delete(id: string): Promise<void> {

    const [rows] = await connection.query(
      `UPDATE user SET is_active = false WHERE id = UUID_TO_BIN(?);`, [id]
    ) as [ResultSetHeader, any];

    if(rows.affectedRows === 0){
      throw new Error('User not found');
    }

    await connection.query(
      `UPDATE comment SET is_active = false WHERE user_id = UUID_TO_BIN(?);`, [id]
    );
  }
  
}


