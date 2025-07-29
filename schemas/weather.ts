import { array, number, object, safeParse, string, type InferInput } from "valibot";

const cloudsSchema = object({
    "all": number(),
});

const coordSchema = object({
    "lon": number(),
    "lat": number(),
});

const mainSchema = object({
    "temp": number(),
    "feels_like": number(),
    "temp_min": number(),
    "temp_max": number(),
    "pressure": number(),
    "humidity": number(),
    "sea_level": number(),
    "grnd_level": number(),
});

const sysSchema = object({
    "type": number(),
    "id": number(),
    "country": string(),
    "sunrise": number(),
    "sunset": number(),
});

const weatherSchema = object({
    "id": number(),
    "main": string(),
    "description": string(),
    "icon": string(),
});

const windSchema = object({
    "speed": number(),
    "deg": number(),
});

const welcomeSchema = object({
    "coord": coordSchema,
    "weather": array(weatherSchema),
    "base": string(),
    "main": mainSchema,
    "visibility": number(),
    "wind": windSchema,
    "clouds": cloudsSchema,
    "dt": number(),
    "sys": sysSchema,
    "timezone": number(),
    "id": number(),
    "name": string(),
    "cod": number(),
});

export type WeatherData = InferInput<typeof welcomeSchema>;

/**
 * Validates the Weather input.
 * @param {unknown} input - The input data to validate.
 * @returns {import("valibot").SafeParseReturn<WeatherData>} The validation result.
 */
export const validateWeatherData = (input: unknown) => {
    return safeParse(welcomeSchema, input);
}