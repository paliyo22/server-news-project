import { Category } from "../enum";
import type { INewsModel } from "../interfaces";
import { apiData, delay, saveUrlImage } from ".";

export let isFetching: boolean = false;

export const tryFetch = (newsModel: INewsModel) => {
    if (isFetching) return; 
    
    isFetching = true;
    fetchNews(newsModel);
}

export const fetchNews = async (newsModel: INewsModel) => {
    try {
        // Fetch all categories with rate limiting interval between API calls
        const categoryDataPromises = [];
        for(const category of Object.values(Category)) {
            const newsArray = await apiData(category);
            categoryDataPromises.push({ category, newsArray });
            await delay(1000); // Respect API rate limiting
        }

        // Process images in parallel to optimize I/O
        const processedData = await Promise.all(
            categoryDataPromises.map(async ({ category, newsArray }) => ({
                category,
                news: await saveUrlImage(newsArray)
            }))
        );

        // Save to database sequentially to avoid connection pool overload
        for(const { category, news } of processedData) {
            await newsModel.addNewsList(news, category);
        }
        
        console.log('All news has been updated.');
        await newsModel.updateFetchDate();
    } catch (error) {
        if(error instanceof Error){
            console.log(error.message);
        }else{
            console.log(error);
        }
    }finally{
        isFetching = false;
    }
}