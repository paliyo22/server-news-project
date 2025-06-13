import axios from "axios";
import { Category } from "../enum/category";
import { validateApiNews } from "../schemas";
import { NewsModel } from "../models/mysql/news"

const fetchNewsFromApi = async (category: Category): Promise<void> =>{
    try{
        const response = await axios.get(
            `https://google-news13.p.rapidapi.com/${category}?lr=es-AR`,
            {
                headers:{
                    //'x-rapidapi-key': 
                    //'x-rapidapi-host': 
                }
            }
        );
        if(response){
            console.log(response.status, '\n TEXTO: ', response.statusText)
        }
        const newsArray = validateApiNews(response.data);
        if(!newsArray.success){
            console.log('Error al comparar los tipos de datos');
            return;
        }
        // cambiar en controlador
        // aca llama al servicio que transforma el url
        const aux = new NewsModel;
        const flag = await aux.saveNews(newsArray.output, category);
        console.log(`✅ ${newsArray.output.items.length} noticias procesadas (insertadas o ignoradas si ya existían).`);
    }catch(e){
        console.error('❌ Error en el proceso de pull o guardado:', e);
    }
}

// Función principal que orquesta todo
const run = async () => {

    const news = await fetchNewsFromApi(Category.Ciencia);
 
};

run();