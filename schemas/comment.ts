import { date, nullable, number, object, optional, safeParse, string, type InferInput } from "valibot";

const commentSchema = object({
    id: optional(string()),
    news_id: optional(nullable(string())),
    user_id: string(),
    parent_comment_id: optional(nullable(string())),
    content: string(),
    created: optional(date())
});

const commentOutput = object({
    ...commentSchema.entries,
    likes: number(),
    replies: number(),
    username: string()
})
export type CommentSchema = InferInput<typeof commentSchema>

export type CommentOutput = InferInput<typeof commentOutput> 

export const validateComment = (imput: unknown) => {
    return safeParse(commentSchema, imput)
};

export const validateCommentOutput = (imput: unknown) => {
    return safeParse(commentOutput, imput)
};