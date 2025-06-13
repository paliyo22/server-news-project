import type { ResultSetHeader } from "mysql2";
import { connection } from "../../db/mysql";
import type { Category } from "../../enum/category";
import type { INewsModel } from "../../interfaces";
import { validateCommentOutput, validateOutputNews, type CommentOutput, type CommentSchema, type NewsImput, type NewsOutput } from "../../schemas";


export class NewsModel implements INewsModel{

  /**
   * Inserts a genre if it doesn't exist and returns its ID.
   * @param {Category} category - The genre name.
   * @returns {Promise<number>} Genre ID.
   * @throws {Error} If the genre ID cannot be retrieved.
   */
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

  /**
   * Inserts a news item into the database.
   * @param {any} i - Object containing news data.
   * @param {number} genreId - Genre ID for the news.
   * @param {string} uuid - Generated UUID for the news.
   */
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

  /**
   * Inserts related subnews items linked to a parent news.
   * @param {any[]} subnews - Array of subnews items.
   * @param {number} genreId - Genre ID.
   * @param {string} parentUuid - UUID of the parent news item.
   */
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

  /**
   * Retrieves a paginated list of active news items.
   * @param {number} limit - Maximum number of results.
   * @param {number} offset - Number of results to skip.
   * @returns {Promise<{ data: NewsOutput[], total: number } | null>} News data and total count.
   * @throws {Error} On connection or validation failure.
   */
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

  /**
   * Retrieves featured news with most likes in the past month.
   * @param {number} limit - Maximum number of results.
   * @returns {Promise<NewsOutput[] | null>} List of featured news.
   * @throws {Error} On validation or connection failure.
   */
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
  
  /**
   * Retrieves a news item by its ID.
   * @param {string} id - UUID of the news item.
   * @returns {Promise<NewsOutput | null>} The news item or null if not found.
   * @throws {Error} On validation or connection failure.
   */
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

  /**
   * Retrieves subnews items related to a parent news item.
   * @param {string} id - UUID of the parent news item.
   * @returns {Promise<NewsOutput[] | null>} List of subnews.
   * @throws {Error} On validation or connection failure.
   */
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

  /**
   * Retrieves top-level comments for a news item.
   * @param {string} id - UUID of the news item.
   * @returns {Promise<CommentOutput[] | null>} List of comments.
   * @throws {Error} On validation failure.
   */
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

  /**
   * Toggles the active status of a news item.
   * @param {string} id - UUID of the news item.
   * @returns {Promise<boolean>} True if the status was changed successfully.
   */
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

  /**
   * Deletes all inactive news items.
   * @returns {Promise<number>} Number of deleted news items.
   */
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

  /**
   * Saves a batch of news items with their category.
   * @param {NewsImput} news - News data to save.
   * @param {Category} category - Category of the news.
   * @throws {Error} On transaction failure.
   */
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

  /**
   * Retrieves a paginated list of inactive news items.
   * @param {number} limit - Maximum number of results.
   * @param {number} offset - Number of results to skip.
   * @returns {Promise<{ data: NewsOutput[], total: number } | null>} News data and total count.
   * @throws {Error} On connection or validation failure.
   */
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

  /**
   * Retrieves child comments for a given comment.
   * @param {string} commentId - UUID of the parent comment.
   * @returns {Promise<CommentOutput[] | null>} List of child comments.
   * @throws {Error} On validation failure.
   */
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

  /**
   * Retrieves a paginated list of news filtered by category.
   * @param {number} limit - Maximum number of results.
   * @param {number} offset - Number of results to skip.
   * @param {Category} category - Category to filter news by.
   * @returns {Promise<{ data: NewsOutput[], total: number } | null>} News data and total count.
   * @throws {Error} On connection or validation failure.
   */
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
 