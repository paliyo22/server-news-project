import { 
    boolean, date, email, enum_, maxValue, minLength, nullable, 
    object, optional, partial, pipe, safeParse, string, 
    toMaxValue, union, uuid, type InferInput 
} from "valibot";
import { Role } from "../enum";

const emailSchema = pipe(string(), email());
const passwordSchema = pipe(string(), minLength(6));

const userSchema = object({
    name: string(),
    lastname: string(),
    birthday: pipe(union([string(), date()]), toMaxValue(new Date())),
    username: pipe(string(), minLength(4)),
    subscription: optional(boolean()),
    email: emailSchema,
    created: optional(pipe(date(), maxValue(new Date()))),
    role: enum_(Role),
    is_active: optional(boolean()),
})

const authSchema = object({
    email: emailSchema,
    password: passwordSchema
})

const userInputSchema = object({
    ...userSchema.entries,
    ...authSchema.entries
})

const userOutputSchema = object({
    id: pipe(string(), uuid()),
    ...userSchema.entries,
})

export type UserOutput = InferInput<typeof userOutputSchema>

export type AuthInput = InferInput<typeof authSchema>

export type UserInput = InferInput<typeof userInputSchema>

/**
 * Validates the user input (creation or update).
 * @param {unknown} input - The input data to validate.
 * @returns {import("valibot").SafeParseReturn<UserInput>} The validation result.
 */
export const validateUser = (input: unknown) => {
    return safeParse(userInputSchema, input)
} 

/**
 * Validates the user output, and coerces values for `subscription` and `is_active` to booleans.
 * @param {unknown} input - The input data to validate.
 * @returns {import("valibot").SafeParseReturn<UserOutput>} The validation result.
 */
export const validateUserOutput = (input: unknown) => {
    if (typeof input === "object" && input !== null && "subscription" in input) {
        const obj = input as { [key: string]: any };

        obj.subscription = Boolean(obj.subscription);

        if ("is_active" in obj) {
            obj.is_active = Boolean(obj.is_active);
        }
    }
    return safeParse(userOutputSchema, input)
} 

/**
 * Validates partial user input (for updating specific fields).
 * @param {unknown} input - The input data to validate.
 * @returns {import("valibot").SafeParseReturn<UserInput>} The validation result.
 */
export const validatePartialUser = (input: unknown) => {
    return safeParse(partial(userInputSchema), input)
}

/**
 * Validates the authentication input (email and password).
 * @param {unknown} input - The input data to validate.
 * @returns {import("valibot").SafeParseReturn<AuthInput>} The validation result.
 */
export const validateAuth = (input: unknown) => {
    return safeParse(authSchema, input)
}

/**
 * Validates the password input, ensuring it meets the minimum length requirement.
 * @param {unknown} input - The input data to validate.
 * @returns {import("valibot").SafeParseReturn<string>} The validation result.
 */
export const validatePassword = (input: unknown) => {
    return safeParse(passwordSchema, input);
}