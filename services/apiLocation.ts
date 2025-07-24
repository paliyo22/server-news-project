import axios from "axios"
import config from "../config"
import { validateLocationData, type LocationData } from "../schemas";


export const apiLocationData = async (ip: string): Promise<LocationData> => {
    const response = await axios.get(
        `https://ip-geo-location9.p.rapidapi.com/geolocation?`,
        {
            params: {
                ip
            },
            headers: {
                'x-rapidapi-key': config.ApiKey,
                'x-rapidapi-host': 'ip-geo-location9.p.rapidapi.com'
            }
        }
    )

    if(response.status !== 200){
        throw new Error(`Status: ${response.status} \nMessage: ${response.statusText} \n ERROR: CONNECTION WHIT API FINALIZE`);
    }

    const data = validateLocationData(response.data);
    if(!data.success){
        throw new Error("Validation error");
    }

    return data.output;
}