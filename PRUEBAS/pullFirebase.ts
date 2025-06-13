import axios from 'axios';
import { connection } from '../db/mysql';

type NewsItem = {
  category: string;
  // id: number; // descartado
  imageUrl?: string;
  // key: string; // descartado
  // likes: number; // eliminado
  publisher: string;
  snippet: string;
  timestamp: string; // formato unix en milisegundos (string numérica)
  title: string;
  url: string;
  // visible: boolean; // descartado
};

// Mapeo de categorías a valores numéricos
const categoryToGenre: Record<string, number> = {
  entertainment: 1,
  world: 2,
  business: 3,
  health: 4,
  sport: 5,
  science: 6,
  technology: 7
};

// Función que obtiene noticias desde una API externa
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

// Función que guarda las noticias en la base de datos
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
            Math.floor(Number(i.timestamp) / 1000), // created
            i.title,
            i.snippet,
            i.imageUrl || null, // thumbnail
            i.url,              // news_url
            i.publisher,
            genre               // news_genre (numérico)
          ]
        );
      } catch (e: any) {
        if (e.code === 'ER_DUP_ENTRY') {
          // Si el news_url ya existe, ignora e inserta la siguiente
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

// Función principal que orquesta todo
const run = async () => {
  try {
    const news = await fetchNewsFromAPI();
    await saveNews(news);
  } catch (e) {
    console.error('❌ Error en el proceso de pull y guardado:', e);
  } finally {
    connection.end(); // cerrar conexión al finalizar
  }
};

run();

