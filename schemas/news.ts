import { array, boolean, date, enum_, nullable, number, object, optional, safeParse, string, union, unknown, type InferInput } from "valibot";
import { Category } from "../enum";


const imagesSchema = object({
    thumbnail: optional(string()),
    thumbnailProxied: optional(string())
})

const subNewsSchema = object({
    timestamp: union([string(), date()]),
    title: string(),
    snippet: string(),
    images: optional(nullable(imagesSchema)),
    newsUrl: string(),
    publisher: string(),
    image_url: optional(nullable(string()))
})

const itemSchema = object({
    ...subNewsSchema.entries,
    subnews: optional(nullable(array(subNewsSchema))),
    hasSubnews: boolean(),
    id: optional(string()), //campo de salida
    likes: optional(number()), // campo de salida
    is_active: optional(boolean()), // campo de salida
    category: optional(enum_(Category)) // campo de salida
});

const welcomeSchema = object({
    status: string(),
    items: array(itemSchema),
});

export type SubNewsItem = InferInput<typeof subNewsSchema> 

export type NewsItem = InferInput<typeof itemSchema> 

export type NewsImput = InferInput<typeof welcomeSchema> 

export type NewsOutput = InferInput<typeof itemSchema> 

/**
 * Validates unknown input against the news API welcome schema.
 * @param {unknown} input - The data to validate.
 * @returns {import("valibot").SafeParseReturn<NewsInput>} Validation result.
 */
export const validateApiNews = (input: unknown) => {
    return safeParse(welcomeSchema, input);
}

/**
 * Validates unknown input against the news item schema.
 * Also coerces `hasSubnews` and `is_active` fields to booleans if present.
 * @param {unknown} input - The data to validate.
 * @returns {import("valibot").SafeParseReturn<NewsOutput>} Validation result.
 */
export const validateOutputNews = (input: unknown) => {
    if (typeof input === "object" && input !== null && "hasSubnews" in input) {
        const obj = input as { [key: string]: any };

        obj.hasSubnews = Boolean(obj.hasSubnews);

        if ("is_active" in obj) {
            obj.is_active = Boolean(obj.is_active);
        }
    }

    return safeParse(itemSchema, input);
};