import type { ResultSetHeader } from "mysql2";
import { connection } from "../../db/mysql";
import type { Category } from "../../enum/category";
import type { INewsModel } from "../../interfaces";
import { validateCommentOutput, validateOutputNews, type CommentOutput, type CommentSchema, type NewsImput, type NewsOutput } from "../../schemas";


export class NewsModel implements INewsModel{

  private async getOrCreateGenreId(category: Category): Promise<number> {
      await connection.query(
          `INSERT IGNORE INTO genre (name) VALUES (?);`,
          [category.toLowerCase()]
      );
      const [genreRows] = await connection.query(
          'SELECT id FROM genre WHERE name = ?',
          [category.toLowerCase()]
      );
      const genreId = (genreRows as any)[0]?.id;
      if (!genreId) {
          throw new Error("No se pudo obtener el ID de género");
      }
      return genreId;
  }

  private async insertNewsItem(i: any, genreId: number, uuid: string) {
      await connection.query(
          `INSERT IGNORE INTO news (
              id, created, title, snippet, thumbnail, thumbnail_proxied,
              subnews, has_subnews, news_url, publisher, news_genre, image_url
          ) VALUES (UUID_TO_BIN("${uuid}"), FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, ?, ?, ${genreId}, ?);`,
          [
              Math.floor(Number(i.timestamp) / 1000), i.title, i.snippet,
              i.images?.thumbnail ?? null, i.images?.thumbnailProxied ?? null,
              null, i.hasSubnews, i.newsUrl, i.publisher, i.image_url ?? null
          ]
      );
  }

  private async insertSubnews(subnews: any[], genreId: number, parentUuid: string) {
      for (const e of subnews) {
          try {
              await connection.query(
                  `INSERT INTO news (
                      created, title, snippet, thumbnail, thumbnail_proxied,
                      subnews, has_subnews, news_url, publisher, news_genre, image_url
                  ) VALUES (FROM_UNIXTIME(?), ?, ?, ?, ?, UUID_TO_BIN("${parentUuid}"), ?, ?, ?, ${genreId}, ?);`,
                  [
                      Math.floor(Number(e.timestamp) / 1000), e.title, e.snippet,
                      e.images?.thumbnail ?? null, e.images?.thumbnailProxied ?? null,
                      false, e.newsUrl, e.publisher, e.image_url ?? null
                  ]
              );
          } catch (err: any) {
              if (err.code === 'ER_DUP_ENTRY') {
                  await connection.query(
                      `UPDATE news SET subnews = UUID_TO_BIN("${parentUuid}") WHERE news_url = ?;`,
                      [e.newsUrl]
                  );
                  continue;
              } else {
                  throw err;
              }
          }
      }
  }

  async getNews(limit: number, offset: number): Promise<{ data: NewsOutput[], total: number } | null> {
    try {
      const [rows] = await connection.query(
        `SELECT bin_to_uuid(n.id) AS id, n.created AS timestamp, n.title, 
        n.snippet, n.image_url, n.news_url AS newsUrl, n.publisher, n.is_active,
        n.has_subnews AS hasSubnews, g.name AS category, COUNT(l.user_id) AS likes,
        (SELECT COUNT(id) FROM news WHERE is_active is true) AS total
        FROM news n
        LEFT JOIN genre g ON g.id = n.news_genre
        LEFT JOIN likes_x_news l ON l.news_id = n.id
        WHERE n.is_active is true
        GROUP BY n.id
        ORDER BY n.created DESC LIMIT ? OFFSET ?;`,
        [limit, offset]
      ) as [any[], any];
      if (rows.length === 0) {
        return null;   
      }
      const total = rows[0].total;
      const data: NewsOutput[] = rows.map(validateOutputNews)
                                .filter(result => result.success)
                                .map(result => result.output as NewsOutput);
      if(data.length === 0){
        throw new Error('ERROR EN LA VALIDACION');  
      }
      return {data, total};
    } catch (e) {
      throw new Error('Error conectando a la base de datos');
    } 
  }

  async featuredNews(limit: number): Promise<NewsOutput[] | null> {
    try {
      const [rows] = await connection.query(
        `SELECT BIN_TO_UUID(n.id) AS id, n.created AS timestamp, n.title, 
          n.snippet, n.image_url, n.news_url AS newsUrl, n.publisher, 
          n.has_subnews AS hasSubnews, g.name AS category, COUNT(l.user_id) AS likes
          FROM news n
          LEFT JOIN genre g ON g.id = n.news_genre
          LEFT JOIN likes_x_news l ON l.news_id = n.id
          WHERE (n.created >= NOW() - INTERVAL 1 MONTH) and (n.is_active is true)
          GROUP BY n.id
          ORDER BY likes DESC LIMIT ?;`,[limit]
      ) as [any[], any];

      if (rows.length === 0) {
        return null;   
      }

      const news: NewsOutput[] = rows.map(validateOutputNews)
                                  .filter(result => result.success)
                                  .map(result => result.output as NewsOutput);
      if(news.length === 0){
        throw new Error('ERROR EN LA VALIDACION');  
      }
      return news;

    } catch (e) {
      throw e;
    }
  }
  
  async getById(id: string): Promise<NewsOutput | null> {
     try {
      const [rows] = await connection.query(
        `SELECT BIN_TO_UUID(n.id) AS id, n.created AS timestamp, n.title, 
        n.snippet, n.image_url, n.news_url AS newsUrl, n.publisher, n.is_active,
        n.has_subnews AS hasSubnews, g.name AS category, COUNT(l.user_id) AS likes
        FROM news n
        LEFT JOIN genre g ON g.id = n.news_genre
        LEFT JOIN likes_x_news l ON l.news_id = n.id
        WHERE n.id = UUID_TO_BIN(?)
        GROUP BY n.id;`,[id]
      ) as [any[], any];
      if (rows.length === 0) {
        return null;   
      }
      const result = validateOutputNews(rows[0]); 
      if(!result.success){
        throw new Error('ERROR EN LA VALIDACION');  
      }
      return result.output as NewsOutput;

    } catch (e) {
        if (e instanceof Error) {
            throw new Error(e.message);
        } else {
            throw e;
        }
    }
  }

  async getSubnews(id:string): Promise<NewsOutput[] | null> {
    try {
      const [rows] = await connection.query(
        `SELECT BIN_TO_UUID(n.id) AS id, n.created AS timestamp, n.title, 
        n.snippet, n.image_url, n.news_url AS newsUrl, COUNT(l.user_id) AS likes,
        n.has_subnews AS hasSubnews, n.publisher, g.name AS category
        FROM news n
        LEFT JOIN genre g ON g.id = n.news_genre
        LEFT JOIN likes_x_news l ON l.news_id = n.id
        WHERE n.subnews = UUID_TO_BIN(?) AND n.is_active = TRUE
        GROUP BY n.id;`,[id]
      ) as [any[], any];
      if (rows.length === 0) {
        return null;   
      }

      const news: NewsOutput[] = rows.map(validateOutputNews)
                                  .filter(result => result.success)
                                  .map(result => result.output as NewsOutput);
      if(news.length === 0){
        throw new Error('ERROR EN LA VALIDACION');  
      }

      return news;
    } catch (e) {
        if (e instanceof Error) {
            throw new Error(e.message);
        } else {
            throw e;
        }
    } 
  }

  async getComments(id: string): Promise<CommentOutput[] | null> {
  
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
      throw new Error('ERROR EN LA VALIDACION');
    }
    return comments;
  }

  async status(id: string): Promise<boolean> {
    try {
        const [result] = await connection.query(
            `UPDATE news SET is_active = (NOT is_active) WHERE id = UUID_TO_BIN(?);`, [id]
        ) as [ResultSetHeader, any];
        if (result.affectedRows === 0) {
            return false;
        }
        return true;
    } catch (e) {
        throw e;
    }
  }

  async clean(): Promise<number> {
    try {
        const [result] = await connection.query(
            `DELETE FROM news WHERE is_active = false`
        ) as [ResultSetHeader, any];
        return result.affectedRows;
    } catch (e) {
        throw e;
    }
  }

  async saveNews(news: NewsImput, category: Category): Promise<void> {
    try {
        await connection.beginTransaction();

        const genreId = await this.getOrCreateGenreId(category);

        for (const i of news.items) {
            const [uuidRows] = await connection.query('SELECT UUID() uuid;');
            const uuid = (uuidRows as any)[0].uuid;

            await this.insertNewsItem(i, genreId, uuid);

            if (i.hasSubnews) {
                await this.insertSubnews(i.subnews!, genreId, uuid);
            }
        }

        await connection.commit();
    } catch (e) {
        await connection.rollback();
        if (e instanceof Error) {
            throw new Error(e.message);
        } else {
            throw e;
        }
    }
  }

  async getInactive(limit: number, offset: number): Promise<{ data: NewsOutput[], total: number } | null> {
    try {
      const [rows] = await connection.query(
        `SELECT bin_to_uuid(n.id) AS id, n.created AS timestamp, n.title, 
        n.snippet, n.image_url, n.news_url AS newsUrl, n.publisher, n.is_active,
        n.has_subnews AS hasSubnews, g.name AS category, 
        (SELECT COUNT(id) FROM news WHERE is_active is true) AS total
        FROM news n
        LEFT JOIN genre g ON g.id = n.news_genre
        WHERE n.is_active is false
        ORDER BY n.created DESC LIMIT ? OFFSET ?;`,
        [limit, offset]
      ) as [any[], any];
      if (rows.length === 0) {
        return null;   
      }
      const total = rows[0].total;
      const data: NewsOutput[] = rows.map(validateOutputNews)
                                .filter(result => result.success)
                                .map(result => result.output as NewsOutput);
      if(data.length === 0){
        throw new Error('ERROR EN LA VALIDACION');  
      }
      return {data, total};
    } catch (e) {
      throw new Error('Error conectando a la base de datos');
    } 
  }

  async getChildComments(commentId: string): Promise<CommentOutput[] | null> {
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
      return null;
    }
    const comments: CommentOutput[] = rows.map(validateCommentOutput)
                                      .filter(result => result.success)
                                      .map(result => result.output as CommentOutput);
    if(comments.length === 0){
      throw new Error('ERROR EN LA VALIDACION');
    }
    return comments;
  }

  async getByCategory(limit: number, offset: number, category: Category): Promise<{ data: NewsOutput[], total: number } | null> {
    try {

      const genreId = await this.getOrCreateGenreId(category);

      const [rows] = await connection.query(
        `SELECT 
          bin_to_uuid(n.id) AS id, n.created AS timestamp, n.title, 
          n.snippet, n.image_url, n.news_url AS newsUrl, n.publisher, 
          n.is_active, n.has_subnews AS hasSubnews, g.name AS category,
          COUNT(l.user_id) AS likes, 
          (SELECT COUNT(id) FROM news 
          WHERE is_active IS TRUE AND news_genre = ?) AS total
        FROM news n
        LEFT JOIN genre g ON g.id = n.news_genre
        LEFT JOIN likes_x_news l ON l.news_id = n.id
        WHERE n.is_active IS TRUE 
          AND n.news_genre = ?
        GROUP BY n.id
        ORDER BY n.created DESC 
        LIMIT ? OFFSET ?;`,
        [genreId, genreId, limit, offset]
      ) as [any[], any];
      if (rows.length === 0) {
        return null;   
      }
      const total = rows[0].total;
      const data: NewsOutput[] = rows.map(validateOutputNews)
                                .filter(result => result.success)
                                .map(result => result.output as NewsOutput);
      if(data.length === 0){
        throw new Error('ERROR EN LA VALIDACION');  
      }
      return {data, total};
    } catch (e) {
      throw e;
    } 
  }
}
 