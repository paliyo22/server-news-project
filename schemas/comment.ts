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

/**
 * Validates an unknown input against the commentSchema.
 * @param {unknown} input - The data to validate as a comment.
 * @returns {import("valibot").SafeParseReturn<CommentSchema>} Validation result object.
 */
export const validateComment = (imput: unknown) => {
    return safeParse(commentSchema, imput)
};

/**
 * Validates an unknown input against the commentOutput schema.
 * @param {unknown} input - The data to validate as a comment output.
 * @returns {import("valibot").SafeParseReturn<CommentOutput>} Validation result object.
 */
export const validateCommentOutput = (imput: unknown) => {
    return safeParse(commentOutput, imput)
};