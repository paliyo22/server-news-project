import { compare, hash } from "bcrypt";
import { connection } from "../../db/mysql";
import { Role } from "../../enum/role";
import type { IAuthModel } from "../../interfaces";
import { validateUserOutput, type AuthInput, type UserInput, type UserOutput } from "../../schemas";
import { config } from "../../config";
import type { ResultSetHeader } from "mysql2";

export class AuthModel implements IAuthModel{

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
      throw new Error("Validatio error");
    } 
    return result.output as UserOutput
  }

  //no se verifica si retorna 0 filas afectadas ya que para ejecutarse se verifica la coneccion y si no falla se borra el refresh igual
  async revokeToken(id: string): Promise<void> {
    await connection.query(
      `UPDATE user SET refresh_token = null WHERE id = UUID_TO_BIN(?)`,[id]
    );
  }

  async saveToken(id: string, token: string): Promise<void>{
    const [rows] = await connection.query(
      `UPDATE user SET refresh_token = ? WHERE id = UUID_TO_BIN(?)`,[token, id]
    );
  }

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
}