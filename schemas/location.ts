import { array, boolean, number, object, safeParse, string, type InferInput } from "valibot";


const citySchema = object({
    "name": string(),
    "geoname_id": number(),
});

const continentSchema = object({
    "name": string(),
    "geoname_id": number(),
    "code": string(),
});

const countrySchema = object({
    "iso_code": string(),
    "name": string(),
    "geoname_id": number(),
    "is_in_european_union": boolean(),
});

const locationSchema = object({
    "latitude": number(),
    "longitude": number(),
});

const postalSchema = object({
    "code": string(),
});

const subdivisionSchema = object({
    "iso_code": string(),
    "name": string(),
    "geoname_id": number(),
});

const welcomeSchema = object({
    "location": locationSchema,
    "country": countrySchema,
    "subdivisions": array(subdivisionSchema),
    "registered_country": countrySchema,
    "continent": continentSchema,
    "postal": postalSchema,
    "city": citySchema,
});

export type LocationData = InferInput<typeof welcomeSchema>;

export const validateLocationData = (input: unknown) => {
    return safeParse(welcomeSchema, input);
}