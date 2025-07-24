import cors from 'cors';

const ACCEPTED_ORIGINS = [
    'https://noticias-angular-beige.vercel.app'
]

interface CorsMiddlewareOptions{
    acceptedOrigins?: string[]
}

/**
 * CORS Middleware function to handle Cross-Origin Resource Sharing.
 * 
 * This middleware allows requests from specific origins, which can be customized
 * through the `options` parameter. By default, it allows requests from
 * ACCEPTED_ORIGINS.
 * 
 * The `credentials: true` option is included to allow the exchange of cookies
 * and authorization headers between client and server.
 * 
 * @param {CorsMiddlewareOptions} options - Optional custom options for configuring accepted origins.
 * @returns {Function} The CORS middleware function that can be used in Express.
 */
export const corsMiddleware = (options: CorsMiddlewareOptions = {}) => {
    const {acceptedOrigins = ACCEPTED_ORIGINS} = options

    const corsOptions = {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (!origin || acceptedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true
    };
    return cors(corsOptions);
}



