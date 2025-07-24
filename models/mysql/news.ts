import type { ResultSetHeader } from "mysql2";
import { connection } from "../../db/mysql";
import type { Category } from "../../enum";
import type { INewsModel } from "../../interfaces";
import { validateOutputNews, type NewsImput, type NewsItem, type NewsOutput, type SubNewsItem } from "../../schemas";


export class NewsModel implements INewsModel{

  private async getOrCreateGenreId(category: Category): Promise<number> {
    const [genreRows] = await connection.query(
        'SELECT id FROM genre WHERE name = ?',
        [category.toLowerCase()]
    ) as [any[], any];

    let genreId = genreRows[0]?.id;

    if (!genreId) {
        await connection.query(
            `INSERT INTO genre (name) VALUES (?);`,
            [category.toLowerCase()]
        );

        const [retryRows] = await connection.query(
            'SELECT id FROM genre WHERE name = ?',
            [category.toLowerCase()]
        ) as [any[], any];

        genreId = retryRows[0]?.id;
    }
    return genreId;
  }

  private async insertNewsItem(i: NewsItem, genreId: number, uuid: string, conn: any) {
    await conn.query(
      `INSERT IGNORE INTO news (
          id, created, title, snippet, thumbnail, thumbnail_proxied,
          has_subnews, news_url, publisher, news_genre, image_url
      ) VALUES (UUID_TO_BIN(?), FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
          uuid,
          Math.floor(Number(i.timestamp) / 1000),
          i.title,
          i.snippet,
          i.images?.thumbnail ?? null,
          i.images?.thumbnailProxied ?? null,
          i.hasSubnews,
          i.newsUrl,
          i.publisher,
          genreId,
          i.image_url ?? null
      ]
    );
  }

  private async insertSubnews(subnews: SubNewsItem[], genreId: number, parentUuid: string, conn: any) {
    let sonId;
    for (const e of subnews) {
        const [exist] = await conn.query(
            'SELECT BIN_TO_UUID(id) as id FROM news WHERE news_url = ?',
            [e.newsUrl]
        ) as [any[], any];

        if (exist.length > 0) {
          sonId = exist[0].id;
        }else{
          const [uuidRows] = await conn.query('SELECT UUID() uuid;');
              sonId = (uuidRows as any)[0].uuid;
          await conn.query(
            `INSERT INTO news (
                id, created, title, snippet, thumbnail, thumbnail_proxied,
                news_url, publisher, news_genre, image_url
            ) VALUES (UUID_TO_BIN(?), FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                sonId,
                Math.floor(Number(e.timestamp) / 1000),
                e.title,
                e.snippet,
                e.images?.thumbnail ?? null,
                e.images?.thumbnailProxied ?? null,
                e.newsUrl,
                e.publisher,
                genreId,
                e.image_url ?? null
            ]
          );
        }

        await conn.query(
          `INSERT INTO news_x_subnews (news_id, subnews_id)
            VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?));`,[parentUuid, sonId]
        ) 
    }
  }

  async getNews(limit: number, offset: number): Promise<{ data: NewsOutput[], total: number }> {
    
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
      return {data: [], total: 0};   
    }
    const total = rows[0].total;
    const data: NewsOutput[] = rows.map(validateOutputNews)
                              .filter(result => result.success)
                              .map(result => result.output as NewsOutput);
    if(data.length === 0){
      throw new Error('Error validating news');  
    }
    return {data, total};
  }

  async getFeatured(limit: number): Promise<NewsOutput[]> {
    
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
      throw new Error('Error fetching news');     
    }

    const news: NewsOutput[] = rows.map(validateOutputNews)
                                .filter(result => result.success)
                                .map(result => result.output as NewsOutput);
    if(news.length === 0){
      throw new Error('ERROR EN LA VALIDACION');  
    }
    return news;
  }
  
  async getById(id: string): Promise<NewsOutput> {
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
      throw new Error('Error fetching news');     
    }

    const result = validateOutputNews(rows[0]);

    if(!result.success){
      throw new Error('Error validating news');  
    }

    return result.output as NewsOutput;
  }

  async getSubnews(id:string): Promise<NewsOutput[]> {

    const [rows] = await connection.query(
      `SELECT BIN_TO_UUID(n.id) AS id, n.created AS timestamp, n.title, 
          n.snippet, n.image_url, n.news_url AS newsUrl, COUNT(l.user_id) AS likes,
          n.has_subnews AS hasSubnews, n.publisher, g.name AS category
      FROM news n
      INNER JOIN news_x_subnews ns ON ns.subnews_id = n.id
      LEFT JOIN genre g ON g.id = n.news_genre
      LEFT JOIN likes_x_news l ON l.news_id = n.id
      WHERE ns.news_id = UUID_TO_BIN(?) AND n.is_active = TRUE
      GROUP BY n.id;`,[id]
    ) as [any[], any];

    if (rows.length === 0) {
      throw new Error('Error fetching news');     
    }

    const news: NewsOutput[] = rows.map(validateOutputNews)
                                .filter(result => result.success)
                                .map(result => result.output as NewsOutput);
    if(news.length === 0){
      throw new Error('Error validating news');  
    }

    return news;
  }

  async setStatus(id: string): Promise<boolean> {
    const [result] = await connection.query(
        `UPDATE news SET is_active = (NOT is_active) WHERE id = UUID_TO_BIN(?);`, [id]
    ) as [ResultSetHeader, any];

    if (result.affectedRows === 0) {
      return false;
    }

    return true;
  }

  async clean(): Promise<number> {
    
    const [result] = await connection.query(
        `DELETE FROM news WHERE is_active = false`
    ) as [ResultSetHeader, any];

    return result.affectedRows;
  }

  async checkFetchDate(): Promise<void> {
    const [rows] = await connection.query(
      `SELECT fecha FROM last_pull WHERE id = 1;`
    ) as [any[], any];

    if (!rows.length) {
      throw new Error("Failed to retrieve date");
    }

    const lastPullDate = rows[0].fecha instanceof Date
      ? rows[0].fecha
      : new Date(rows[0].fecha);

    const now = new Date();
    const diffMs = now.getTime() - lastPullDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 10) {
      const daysRemaining = Math.ceil(10 - diffDays);
      throw new Error(`Can't do that for another ${daysRemaining} days`);
    }  
  }

  async updateFetchDate(): Promise<void> {

    const [rows] = await connection.query(
      'UPDATE last_pull SET fecha = NOW() WHERE id = 1;'
    ) as [ResultSetHeader, any];

    if(!rows.affectedRows){
      throw new Error("Failed to update date");
    } 
  }
  
  async addNewsList(news: NewsImput, category: Category): Promise<void> {
    const conn = await connection.getConnection();
    try {
        await conn.beginTransaction();

        const genreId = await this.getOrCreateGenreId(category);

        for (const i of news.items) {
          // Buscar si ya existe la noticia principal por news_url
          const [existingRows] = await conn.query(
              'SELECT BIN_TO_UUID(id) as id FROM news WHERE news_url = ?',
              [i.newsUrl]
          ) as [any[], any];

          let uuid: string;
          if (existingRows.length > 0) {
              uuid = existingRows[0].id;
              if(i.hasSubnews){
                await conn.query(`
                  UPDATE news SET has_subnews = ? 
                  WHERE id = UUID_TO_BIN(?);`,[i.hasSubnews, uuid]
                )
              }
          } else {
              const [uuidRows] = await conn.query('SELECT UUID() uuid;');
              uuid = (uuidRows as any)[0].uuid;
              await this.insertNewsItem(i, genreId, uuid, conn);
          }

          if (i.hasSubnews) {
              await this.insertSubnews(i.subnews!, genreId, uuid, conn);
          }
        }

        await conn.commit();
    } catch (e) {
        console.log(e);
        await conn.rollback();
        if (e instanceof Error) {
            throw new Error(e.message);
        } else {
            throw e;
        }
    } finally {
        conn.release();
    }
  }

  async getInactive(limit: number, offset: number): Promise<{ data: NewsOutput[], total: number }> {
    const [rows] = await connection.query(
      `SELECT bin_to_uuid(n.id) AS id, n.created AS timestamp, n.title, 
      n.snippet, n.image_url, n.news_url AS newsUrl, n.publisher, n.is_active,
      n.has_subnews AS hasSubnews, g.name AS category, 
      (SELECT COUNT(id) FROM news WHERE is_active is false) AS total
      FROM news n
      LEFT JOIN genre g ON g.id = n.news_genre
      WHERE n.is_active is false
      ORDER BY n.created DESC LIMIT ? OFFSET ?;`,
      [limit, offset]
    ) as [any[], any];

    if (rows.length === 0) {
      return {data: [], total: 0};
    }

    const total = rows[0].total;
    const data: NewsOutput[] = rows.map(validateOutputNews)
                              .filter(result => result.success)
                              .map(result => result.output as NewsOutput);
                              
    if(data.length === 0){
      throw new Error('Error validating news');  
    }

    return {data, total};
  }

  async getByCategory(limit: number, offset: number, category: Category): Promise<{ data: NewsOutput[], total: number }> {
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
      throw new Error('Error fetching news');   
    }

    const total = rows[0].total;
    const data: NewsOutput[] = rows.map(validateOutputNews)
                              .filter(result => result.success)
                              .map(result => result.output as NewsOutput);

    if(data.length === 0){
      throw new Error('Error validating news');  
    }

    return {data, total};
  }
  
  async search(contain: string): Promise<NewsOutput[]> {
    const [rows] = await connection.query(
      `SELECT BIN_TO_UUID(n.id) AS id, n.created AS timestamp, n.title, 
      n.snippet, n.image_url, n.news_url AS newsUrl, COUNT(l.user_id) AS likes,
      n.is_active, n.has_subnews AS hasSubnews, n.publisher, g.name AS category
      FROM news n
      LEFT JOIN genre g ON g.id = n.news_genre
      LEFT JOIN likes_x_news l ON l.news_id = n.id
      WHERE title LIKE ?
      GROUP BY n.id
      ORDER BY n.created DESC;`, [`%${contain}%`]
    ) as [any[], any];

    if (rows.length === 0) {
      return [];     
    }

    const news: NewsOutput[] = rows.map(validateOutputNews)
                                .filter(result => result.success)
                                .map(result => result.output as NewsOutput);
    if(news.length === 0){
      throw new Error('Error validating news');  
    }

    return news;
  }
}

