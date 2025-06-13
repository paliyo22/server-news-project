import express, { json } from "express";
import config from "./config.ts";
import { authRoutes, newsRoutes, userRoutes } from "./routes/index.ts";
import { AuthModel, NewsModel, UserModel } from "./models/mysql/index.ts";
import { corsMiddleware } from "./middlewares/cors.ts";
import cookieParser from 'cookie-parser';

const app = express();

/**
 * Middleware to parse JSON bodies for incoming requests.
 */
app.use(json())

/**
 * Middleware for handling CORS (Cross-Origin Resource Sharing).
 */
app.use(corsMiddleware())

/**
 * Middleware to parse cookies from incoming requests.
 */
app.use(cookieParser());

/**
 * Disable the 'x-powered-by' header for security reasons.
 */
app.disable('x-powered-by')

/**
 * Custom middleware to log HTTP method and URL of each incoming request.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The function to pass control to the next middleware.
 */
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

/**
 * Registers routes for user, news, and authentication functionalities.
 * 
 * @param {object} userModel - An instance of the UserModel.
 * @param {object} authModel - An instance of the AuthModel.
 * @param {object} newsModel - An instance of the NewsModel.
 */
app.use('/user', userRoutes({ userModel: new UserModel}, { authModel: new AuthModel}))
app.use('/news', newsRoutes({ newsModel: new NewsModel}))
app.use('/auth', authRoutes({ authModel: new AuthModel}))

/**
 * Starts the Express server on a specified port.
 * 
 * @param {number} port - The port to listen to (defaults to process.env.PORT or config.Port).
 */
app.listen(config.Port, () => {
    console.log(`server running on port: http://localhost:${config.Port}`)
})

