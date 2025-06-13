import { date, nullable, number, object, optional, safeParse, string, type InferInput } from "valibot";

/**
 * Schema representing a comment input.
 * @property {string} [id] - Optional comment ID.
 * @property {string | null} [news_id] - Optional associated news ID or null.
 * @property {string} user_id - ID of the user who wrote the comment.
 * @property {string | null} [parent_comment_id] - Optional parent comment ID for replies.
 * @property {string} content - Content of the comment.
 * @property {Date} [created] - Optional creation date of the comment.
 */
const commentSchema = object({
    id: optional(string()),
    news_id: optional(nullable(string())),
    user_id: string(),
    parent_comment_id: optional(nullable(string())),
    content: string(),
    created: optional(date())
});

/**
 * Schema representing the output structure of a comment, extending the input schema.
 * Includes metadata such as likes, replies count, and username.
 * @property {number} likes - Number of likes for the comment.
 * @property {number} replies - Number of replies to the comment.
 * @property {string} username - Username of the comment author.
 */
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