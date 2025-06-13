import axios from "axios";
import type { NewsImput } from "../schemas";

/**
 * Resolves the final image URL after handling potential redirects.
 * 
 * This function takes an image URL and checks if it's valid. If the URL leads to a redirect,
 * the function follows the redirect chain and returns the final URL. If there is no valid URL 
 * or if any error occurs, it returns `null`.
 * 
 * @param {string | undefined} url - The image URL to resolve. If the URL is invalid or undefined, the function returns `null`.
 * @param {string} [context=""] - An optional string to provide context in log messages (e.g., the news item title).
 * 
 * @returns {Promise<string | null>} - The final resolved image URL or `null` if no valid URL is found or an error occurs.
 */
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

/**
 * Saves the final image URL for each item and its subnews by resolving thumbnail URLs.
 * 
 * This function iterates over the provided `newsArray`, processes the `thumbnail` URL for each news item 
 * and its subnews (if any), and stores the resolved image URL. It uses the `resolveImageUrl` function 
 * to handle redirects and validate URLs.
 * 
 * @param {NewsImput} newsArray - The array of news items to process. Each news item may contain a `thumbnail` URL 
 *                               that needs to be resolved.
 * 
 * @returns {Promise<NewsImput>} - A promise that resolves to the updated `newsArray` with resolved image URLs.
 */
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

