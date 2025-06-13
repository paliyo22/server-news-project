import cors from 'cors';

const ACCEPTED_ORIGINS = [
    'http://localhost:8080',
    'http://localhost:1234',
    'http://localhost:4200'
]

interface CorsMiddlewareOptions{
    acceptedOrigins?: string[]
}


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



