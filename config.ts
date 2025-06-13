/**
 * Configuration object for application settings.
 * 
 * This file loads configuration values from environment variables
 * and exposes them for use throughout the application.
 */
export const config = {
    /**
     * The hostname of the database server.
     * 
     * @type {string}
     */
    DBHost: process.env.DB_HOST as string,

    /**
     * The username to connect to the database.
     * 
     * @type {string}
     */
    DBUser: process.env.DB_USER as string,

    /**
     * The password to connect to the database.
     * 
     * @type {string}
     */
    DBPassword: process.env.DB_PASSWORD as string,

    /**
     * The name of the database to use.
     * 
     * @type {string}
     */
    DBName: process.env.DB_NAME as string,

    /**
     * The port on which the database is running.
     * 
     * @type {number}
     */
    DBPort: Number(process.env.DB_PORT as string),

    /**
     * The full database URL (optional).
     * 
     * @type {string}
     */
    DBUrl: process.env.DB_URL as string,

    /**
     * The port on which the server will listen.
     * 
     * @type {number}
     */
    Port: Number(process.env.PORT as string),

    /**
     * The secret key used for signing JWT tokens.
     * 
     * @type {string}
     */
    jwtSecret: process.env.SECRET_KEY as string,

    /**
     * The secret key used for signing refresh tokens.
     * 
     * @type {string}
     */
    jwtSecretRefresh: process.env.SECRET_REFRESH_KEY as string,

    /**
     * A master password used for certain administrative tasks.
     * 
     * @type {string}
     */
    Password: process.env.PASSWORD as string,

    /**
     * The number of salt rounds for bcrypt password hashing.
     * 
     * @type {number}
     */
    salt: Number(process.env.SALT as string),

    /**
     * The number of featured news items to display.
     * This value is hardcoded to 5 for now.
     * 
     * @type {number}
     */
    FeaturedLimit: 5,

    /**
     * API key used to authenticate against external APIs (e.g., news API).
     * 
     * @type {string}
     */
    ApiKey: process.env.API_KEY as string,

    /**
     * Host for the external API (e.g., news API).
     * 
     * @type {string}
     */
    ApiHost: process.env.API_HOST as string
}

/**
 * Default export for config object to be used across the application.
 */
export default config;
