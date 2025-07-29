import { compare, hash } from "bcrypt";
import { connection } from "../../db/mysql";
import { Role } from "../../enum";
import type { IAuthModel } from "../../interfaces";
import { validateUserOutput, type AuthInput, type UserInput, type UserOutput } from "../../schemas";
import { config } from "../../config";
import type { ResultSetHeader } from "mysql2";

/**
 * The AuthModel class handles user authentication, token management, and role assignment.
 * It interacts with the database to create users, log them in, and manage their roles and passwords.
 */
export class AuthModel implements IAuthModel{

  /**
   * Retrieves or creates a role in the database and returns its ID.
   * 
   * @param {Role} role - The role to be retrieved or created.
   * @returns {Promise<number>} The ID of the role.
   * @throws {Error} If the role ID cannot be retrieved.
   */
  private async getOrCreateRoleId(role: Role): Promise<number> {
      await connection.query(
          `INSERT IGNORE INTO role (name) VALUES (?);`,
          [role.toLowerCase()]
      );
      const [roleRows] = await connection.query(
          'SELECT id FROM role WHERE name = ?',
          [role.toLowerCase()]
      );
      const roleId = (roleRows as any)[0]?.id;
      if (!roleId) {
          throw new Error("No se pudo obtener el ID del Role");
      }
      return roleId;
  }

  /**
   * Creates a new user in the database.
   * 
   * @param {UserInput} user - The data of the user to be created.
   * @returns {Promise<UserOutput | boolean>} The created user's data or `true` if the username already exists.
   * @throws {Error} If an error occurs during user creation.
   */
  async createUser(user: UserInput): Promise<UserOutput | boolean> {
    try {
      const roleId = await this.getOrCreateRoleId(user.role);
      const [uuidRows] = await connection.query('SELECT UUID() uuid;');
      const uuid = (uuidRows as any)[0].uuid;
      const hashedPassword = await hash(user.password, config.salt);

      try{
        const [rows] = await connection.query(
          `INSERT INTO user (id, user_name, lastname, birthday, username,
            email, password, subscription, user_role)
          VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            uuid, user.name, user.lastname, user.birthday, user.username, user.email, 
            hashedPassword, user.subscription, roleId
          ]
        );
      }catch(err){
        const e = err as { code?: string; message?: string };
          if (e.code === 'ER_DUP_ENTRY') {
            if (e.message?.includes('username')) return true;
            return false;
          }
        throw err;
      }

      const newUser = { id: uuid, name: user.name, lastname: user.lastname, 
        birthday: user.birthday, username: user.username, email: user.email, subscription: user.subscription, role: user.role }
      
      return newUser as UserOutput;

    } catch (e) {
      throw e;
    }
  }
  
  /**
   * Retrieves a user by ID from the database.
   * 
   * @param {string} id - The ID of the user to retrieve.
   * @param {string} [expectedRefreshToken] - The expected refresh token (optional).
   * @returns {Promise<UserOutput | null>} The user data if found, or null if not found.
   * @throws {Error} If there is a validation error with the user data.
   */
  async getById(id: string, expectedRefreshToken?: string): Promise<UserOutput | null> {
    const [rows] = await connection.query(
      `SELECT BIN_TO_UUID(u.id) AS id, u.user_name AS name, u.lastname, u.birthday, u.username,
        u.email, u.subscription, r.name AS role, u.is_active,
        u.created, u.refresh_token
      FROM user u 
      LEFT JOIN role r on r.id = u.user_role 
      WHERE u.id = UUID_TO_BIN(?);`,
      [id]
    ) as [any[], any];

    if (rows.length === 0) return null
    
    if(expectedRefreshToken && expectedRefreshToken !== rows[0].refresh_token){
        return null;
    }
    const result = validateUserOutput(rows[0]);
    if(!result.success){
      throw new Error("Validation error aaaa");
    } 
    return result.output;
  }

  /**
   * Revokes the refresh token for a user, essentially logging them out.
   * 
   * @param {string} id - The ID of the user whose token should be revoked.
   * @returns {Promise<void>} Resolves when the refresh token has been revoked.
   */
  async revokeToken(id: string): Promise<void> {
    await connection.query(
      `UPDATE user SET refresh_token = null WHERE id = UUID_TO_BIN(?)`,[id]
    );
  }

  /**
   * Saves a new refresh token for the user in the database.
   * 
   * @param {string} id - The ID of the user to save the token for.
   * @param {string} token - The refresh token to save.
   * @returns {Promise<void>} Resolves when the refresh token has been saved.
   */
  async saveToken(id: string, token: string): Promise<void>{
    const [rows] = await connection.query(
      `UPDATE user SET refresh_token = ? WHERE id = UUID_TO_BIN(?)`,[token, id]
    );
  }

  /**
   * Logs in a user by verifying their credentials.
   * 
   * @param {AuthInput} auth - The user's credentials (email and password).
   * @returns {Promise<UserOutput | null>} The user data if login is successful, or null if credentials are invalid.
   */
  async logIn(auth: AuthInput): Promise<UserOutput | null>{ 
    const [rows] = await connection.query(
      `SELECT BIN_TO_UUID(u.id) AS id, u.user_name AS name, u.lastname, u.birthday, u.username,
        u.email, u.password, u.subscription, r.name AS role, u.is_active,
        u.created, u.refresh_token
      FROM user u 
      LEFT JOIN role r on r.id = u.user_role 
      WHERE email = ?`,
      [auth.email]
    ) as [any[], any];
    if(rows.length === 0){
      return null;
    }
    const isValid = await compare(auth.password, rows[0].password);
    if(!isValid){
      return null;
    }
    const result = validateUserOutput(rows[0]);
    if(!result.success){
      console.log(result.issues)
      throw new Error("Internal validation error");
    } 
    return result.output as UserOutput
  }

  /**
   * Updates the user's password.
   * 
   * @param {string} id - The ID of the user who wants to update their password.
   * @param {string} oldPassword - The user's current password.
   * @param {string} newPassword - The new password to set.
   * @returns {Promise<boolean>} `true` if the password was updated successfully, otherwise `false`.
   * @throws {Error} If the passwords are the same or if the old password does not match.
   */
  async newPassword(id: string, oldPassword: string, newPassword: string): Promise<boolean>{
    if(oldPassword === newPassword){
      throw new Error("It's the same password")
    }
    const [rows] = await connection.query(
      `SELECT password FROM user WHERE id = UUID_TO_BIN(?);`,[id]
    ) as [any[], any] ;
    if(rows.length === 0){
      return false;
    }
    const isValid = await compare(oldPassword, rows[0].password);
    if(!isValid){
      return false;
    }
    const hashedPassword = await hash(newPassword, config.salt);
    const [result] = await connection.query(
      `UPDATE user SET password = ? WHERE id = UUID_TO_BIN(?);`,
      [hashedPassword, id]
    ) as [ResultSetHeader, any];
    if(result.affectedRows === 0){
      throw new Error("Error saving new password");
    }
    return true;
  }
  
  /**
   * Updates the user's role in the database.
   * 
   * @param {string} id - The ID of the user whose role needs to be updated.
   * @param {Role} role - The new role to assign to the user.
   * @returns {Promise<void>} Resolves when the role has been updated.
   * @throws {Error} If the user already has the assigned role.
   */
  async newRole(id: string, role: Role): Promise<void> {
    const [rows] = await connection.query(
      `UPDATE user 
      SET user_role = (SELECT r.id FROM role r WHERE r.name = ?)
      WHERE id = UUID_TO_BIN(?);`,[role,id]
    ) as [ResultSetHeader, any];
    if(rows.affectedRows === 0){
      throw new Error("User already has this role");
    }
  }

  /**
   * Activates a user account and all of their comments.
   * 
   * Updates the `is_active` flag to `true` for both the user and their associated comments.
   *
   * @param {string} id - The ID of the user to activate.
   * @returns {Promise<void>} Resolves when the user and their comments are activated.
   * @throws {Error} If the user does not exist.
   */
  async activate(id: string): Promise<void> {
    const [updateResult] = await connection.query(
        `UPDATE user SET is_active = true WHERE id = UUID_TO_BIN(?);`, [id]
    ) as [ResultSetHeader, any];

    if (updateResult.affectedRows === 0) {
      throw new Error("User not found");
    }

    await connection.query(
      `UPDATE comment SET is_active = true WHERE user_id = UUID_TO_BIN(?);`, [id]
    );
  }

}