import axios from "axios";
import { validateApiNews, type NewsImput } from "../schemas";
import config from "../config";



export const apiData = async (category: string): Promise<NewsImput> => { 
   
    const response = await axios.get(
        `https://google-news13.p.rapidapi.com/${category}?lr=es-AR`,
        {
            headers:{
                'x-rapidapi-key': config.ApiKey,
                'x-rapidapi-host': config.ApiHost
            }
        }
    );
    console.log(`Status: ${response.status} \nMessage: ${response.statusText}`);
    if( response.status !== 200 ){
        throw new Error(`Status: ${response.status} \nMessage: ${response.statusText}\nERROR: CONNECTION WHIT API FINALIZE ON CATEGORY: ${category}`);
    }
    const newsArray = validateApiNews(response.data);
    if(!newsArray.success){
        throw new Error("ERROR: MANEJASTE MAL LOS DATOS");
    }
        
    return newsArray.output;    
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));