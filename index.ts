import express, { json } from "express";
import config from "./config.ts";
import { authRoutes, commentRoutes, locationRoutes, newsRoutes, userRoutes } from "./routes/index.ts";
import { AuthModel, CommentModel, NewsModel, UserModel } from "./models/mysql/index.ts";
import { corsMiddleware } from "./middlewares/cors.ts";
import cookieParser from 'cookie-parser';

const app = express();

app.set('trust proxy', true);

/**
 * Middleware to parse JSON bodies for incoming requests.
 */
app.use(json());

/**
 * Middleware for handling CORS (Cross-Origin Resource Sharing).
 */
app.use(corsMiddleware());

/**
 * Middleware to parse cookies from incoming requests.
 */
app.use(cookieParser());

/**
 * Disable the 'x-powered-by' header for security reasons.
 */
app.disable('x-powered-by');

/**
 * Registers routes for user, news, and authentication functionalities.
 * 
 * @param {object} commentModel - An instance of the CommentModel.
 * @param {object} userModel - An instance of the UserModel.
 * @param {object} authModel - An instance of the AuthModel.
 * @param {object} newsModel - An instance of the NewsModel.
 */
app.use('/comment', commentRoutes({ commentModel: new CommentModel }));
app.use('/user', userRoutes({ userModel: new UserModel}, { authModel: new AuthModel}));
app.use('/news', newsRoutes({ newsModel: new NewsModel}));
app.use('/auth', authRoutes({ authModel: new AuthModel}));
app.use('/location', locationRoutes());

/**
 * Starts the Express server on a specified port.
 * 
 * @param {number} port - The port to listen to (defaults to process.env.PORT or config.Port).
 */
app.listen(config.Port, () => {
    console.log(`server running on port: http://localhost:${config.Port}`)
});

