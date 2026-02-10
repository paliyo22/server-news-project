import type { Category } from "../enum";
import type { NewsImput, NewsOutput } from "../schemas";

/**
 * Interface for managing news articles, subnews, comments, and their statuses. This interface defines methods
 * for retrieving news by various filters, saving new articles, managing comments, and cleaning up data.
 * 
 * @interface INewsModel
 */
export interface INewsModel {
    getNews(limit: number, offset: number): Promise<{ data: NewsOutput[], total: number }> 
    getFeatured(limit: number): Promise<NewsOutput[]>
    checkFetchDate(): Promise<boolean>
    updateFetchDate(): Promise<void>
    addNewsList(news: NewsImput, category: Category): Promise<void>
    getById(id: string): Promise<NewsOutput>
    getSubnews(id:string): Promise<NewsOutput[]>
    setStatus(id: string): Promise<boolean>
    clean(): Promise<number>
    getInactive(limit: number, offset: number): Promise<{ data: NewsOutput[], total: number }>
    getByCategory(limit: number, offset: number, category: Category): Promise<{ data: NewsOutput[], total: number }>
    search(contain: string): Promise<NewsOutput[]> 
}