import { connection } from "../db/mysql";
import mysql, { type ResultSetHeader } from 'mysql2/promise'

const DEFAULT_CONFIG = {
  host: 'localhost',
  user: 'root',
  port: 3306,
  password: '',
  database: 'newspagedb'
}

const LocalConnection = await mysql.createConnection(DEFAULT_CONFIG);

async function transferData(): Promise<void> {
  try {
    // ✅ Leer de la base de datos REMOTA
    const [rows] = await connection.query(`SELECT * FROM news;`) as [any[], any];
    
    if (!rows.length) {
      console.log('No records to migrate.');
      return;
    }

    console.log(`Migrating ${rows.length} records...`);

    const insertQuery = `
      INSERT INTO news (
        id, created, title, snippet, thumbnail, thumbnail_proxied,
        image_url, subnews, has_subnews, news_url, publisher,
        is_active, news_genre
      ) VALUES ?`;

    const values = rows.map(row => [
      row.id,
      row.created,
      row.title,
      row.snippet,
      row.thumbnail || null,
      row.thumbnail_proxied || null,
      row.image_url || null,
      row.subnews || null,
      row.has_subnews,
      row.news_url,
      row.publisher,
      row.is_active,
      row.news_genre,
    ]);

    // ✅ Escribir a la base de datos LOCAL
    const [result] = await LocalConnection.query(insertQuery, [values]) as [ResultSetHeader, any];
    
    console.log(`✅ Migration completed: ${result.affectedRows} records inserted.`);
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

const run = async () => {
    try {
        await transferData();
    } catch (e) {
        console.error("Error: NO FUNCA BIEN");
    }finally {
        await connection.end();
        await LocalConnection.end();
    }
};

run();