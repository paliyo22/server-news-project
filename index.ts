import express, { json } from "express";
import config from "./config.ts";
import { authRoutes, newsRoutes, userRoutes } from "./routes/index.ts";
import { AuthModel, NewsModel, UserModel } from "./models/mysql/index.ts";
import { corsMiddleware } from "./middlewares/cors.ts";
import cookieParser from 'cookie-parser';

const app = express();

app.use(json())
app.use(corsMiddleware())
app.use(cookieParser());
app.disable('x-powered-by')

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});


app.use('/user', userRoutes({ userModel: new UserModel}, { authModel: new AuthModel}))
app.use('/news', newsRoutes({ newsModel: new NewsModel}))
app.use('/auth', authRoutes({ authModel: new AuthModel}))

app.listen(config.Port, () => {
    console.log(`server running on port: http://localhost:${config.Port}`)
})

