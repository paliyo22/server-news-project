import axios from "axios";
import { validateApiNews, type NewsImput } from "../schemas";
import config from "../config";


/**
 * Fetches data from the Google News API for a given category.
 * 
 * This function sends a request to the Google News API to retrieve news articles for a specific category.
 * It validates the response and returns the structured news data.
 * 
 * @param {string} category - The category of news to fetch (e.g., "world", "technology").
 * @returns {Promise<NewsImput>} - A promise that resolves with the validated news data.
 * @throws {Error} - Throws an error if the request fails, the status is not 200, or if the response data is invalid.
 */
export const apiData = async (category: string): Promise<NewsImput> => { 
   
    const response = await axios.get(
        `https://google-news13.p.rapidapi.com/${category}?lr=es-AR`,
        {
            headers:{
                'x-rapidapi-key': config.ApiKey,
                'x-rapidapi-host': 'google-news13.p.rapidapi.com'
            }
        }
    );
    console.log(`Status: ${response.status} \nMessage: ${response.statusText}`);
    if( response.status !== 200 ){
        throw new Error(`Status: ${response.status} \nMessage: ${response.statusText}\nERROR: CONNECTION WHIT API FINALIZE ON CATEGORY: ${category}`);
    }
    const newsArray = validateApiNews(response.data);
    if(!newsArray.success){
        throw new Error("Validation error");
    }
        
    return newsArray.output;    
}

/**
 * Delays the execution of the code for a specified number of milliseconds.
 * 
 * This function can be used to introduce a pause in asynchronous operations,
 * useful for rate-limiting or waiting for external resources to settle.
 * 
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>} - A promise that resolves after the delay.
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));