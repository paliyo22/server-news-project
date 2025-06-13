import axios from 'axios';
import { connection } from '../db/mysql';

type NewsItem = {
  category: string;
  imageUrl?: string;
  publisher: string;
  snippet: string;
  timestamp: string; 
  title: string;
  url: string;
};

const categoryToGenre: Record<string, number> = {
  entertainment: 1,
  world: 2,
  business: 3,
  health: 4,
  sport: 5,
  science: 6,
  technology: 7
};

const fetchNewsFromAPI = async (): Promise<NewsItem[]> => {
  try {
    const response = await axios.get('https://news-f8836-default-rtdb.firebaseio.com/news/.json');
    // Convierte el objeto en array
    return Object.values(response.data || {});
  } catch (error: any) {
    console.error('❌ Error al hacer pull de la API externa:', error.message);
    throw new Error('Error al obtener noticias');
  }
};


const saveNews = async (news: NewsItem[]) => {
  try {
    for (const i of news) {
      const genre = categoryToGenre[i.category] ?? null;
      try {
        await connection.query(
          `INSERT INTO news (
            created, title, snippet, thumbnail, thumbnail_proxied,
            subnews, has_subnews, news_url, publisher, news_genre
          ) VALUES (FROM_UNIXTIME(?), ?, ?, ?, null, null, false, ?, ?, ?);`,
          [
            Math.floor(Number(i.timestamp) / 1000), 
            i.title,
            i.snippet,
            i.imageUrl || null, 
            i.url,              
            i.publisher,
            genre               
          ]
        );
      } catch (e: any) {
        if (e.code === 'ER_DUP_ENTRY') {
          continue;
        } else {
          throw e;
        }
      }
    }
    console.log(`✅ ${news.length} noticias procesadas (insertadas o ignoradas si ya existían).`);
  } catch (e) {
    console.error('❌ Error al guardar noticias:', e);
  }
};


const run = async () => {
  try {
    const news = await fetchNewsFromAPI();
    await saveNews(news);
  } catch (e) {
    console.error('❌ Error en el proceso de pull y guardado:', e);
  } finally {
    connection.end();
  }
};

run();

