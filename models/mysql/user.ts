import type { ResultSetHeader } from "mysql2";
import { connection } from "../../db/mysql";
import type { IUserModel } from "../../interfaces/IUserModel";
import { validateUserOutput, type UserInput, type UserOutput } from "../../schemas/user";

export class UserModel implements IUserModel{

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

  async addComment(userId: string, newsId: string, comment: string, parentId?: string): Promise<void> {
    
    await connection.query(
      `INSERT INTO comment (user_id, news_id, parent_comment_id, content)
      VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?);`,
      [userId, newsId, parentId ?? null, comment]
    ) 
    
  }

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
  
  async erase(): Promise<number> {
    const [rows] = await connection.query(
      `DELETE FROM user WHERE is_active = false;`
    ) as [ResultSetHeader, any];
    return rows.affectedRows;
  }

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


