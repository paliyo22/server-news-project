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
        let aux = 0;
        for(const category of Object.values(Category)) {
                        
            const newsArray = await apiData(category);
            const news = await saveUrlImage(newsArray); 
            await newsModel.addNewsList(news, category);
            aux +=  news.items.length;
            await delay(1000);
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