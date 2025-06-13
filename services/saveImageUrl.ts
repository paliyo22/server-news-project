import axios from "axios";
import type { NewsImput } from "../schemas";

const resolveImageUrl = async (url?: string, context: string = ""): Promise<string | null> => {
    if (!url || typeof url !== "string") {
        console.log(`No hay thumbnail válido para procesar en ${context}`);
        return null;
    }

    try {
        const response = await axios.get(url, {
            maxRedirects: 5,
            validateStatus: () => true
        });

        const finalUrl =
            response?.request?._redirectable?._currentUrl && typeof response.request._redirectable._currentUrl === "string"
            ? response.request._redirectable._currentUrl
            : null;
        
        if(!finalUrl || finalUrl.trim() === ""){
            return null;
        }else{
            return finalUrl;
        }

    } catch (e) {
        console.log(`Error accediendo al URL para ${context}:`, e instanceof Error ? e.message : e);
        return null;
    }
};

export const saveUrlImage = async (newsArray: NewsImput): Promise<NewsImput> => {
    for (const row of newsArray.items) {
        row.image_url = await resolveImageUrl(row.images?.thumbnail, row.title);

        if (row.hasSubnews && row.subnews) {
            for (const sub of row.subnews) {
                sub.image_url = await resolveImageUrl(sub.images?.thumbnail, sub.title);
            }
        }
    }
    
    return newsArray;
};

