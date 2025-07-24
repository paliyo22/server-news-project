import axios from "axios";
import { validateWeatherData, type WeatherData } from "../schemas";
import config from "../config";


export const apiWeatherData = async(latitude: string, longitude: string, lang: string): Promise<WeatherData> => {
    const response = await axios.get(
        'https://open-weather13.p.rapidapi.com/latlon?',
        {
            params: {
                latitude,
                longitude,
                lang
            },
            headers:{
                'x-rapidapi-key': config.ApiKey,
                'x-rapidapi-host': 'open-weather13.p.rapidapi.com'
            }
        }
    )

    if(response.status !== 200){
        throw new Error(`Status: ${response.status} \nMessage: ${response.statusText} \n ERROR: CONNECTION WHIT API FINALIZE`);
    }

    const data = validateWeatherData(response.data);
    if(!data.success){
        throw new Error("Validation error");
    }

    return data.output;
}