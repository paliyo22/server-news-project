import type { Category } from "../enum/category";
import type { NewsImput, NewsOutput, CommentSchema, CommentOutput } from "../schemas";

export interface INewsModel {
    getNews(limit: number, offset: number): Promise<{ data: NewsOutput[], total: number } | null> 
    featuredNews(limit: number): Promise<NewsOutput[] | null>
    saveNews(news: NewsImput, category: Category): Promise<void>
    getById(id: string): Promise<NewsOutput | null>
    getSubnews(id:string): Promise<NewsOutput[] | null>
    getComments(id: string): Promise<CommentOutput[] | null>
    status(id: string): Promise<boolean>
    clean(): Promise<number>
    getInactive(limit: number, offset: number): Promise<{ data: NewsOutput[], total: number } | null>
    getChildComments(commentId: string): Promise<CommentOutput[] | null>
    getByCategory(limit: number, offset: number, category: Category): Promise<{ data: NewsOutput[], total: number } | null>
}