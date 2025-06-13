export const config = {
    DBHost: process.env.DB_HOST as string,
    DBUser: process.env.DB_USER as string,
    DBPassword: process.env.DB_PASSWORD as string,
    DBName: process.env.DB_NAME as string,
    DBPort: Number(process.env.DB_PORT as string),
    DBUrl: process.env.DB_URL as string,
    Port: Number(process.env.PORT as string),
    jwtSecret: process.env.SECRET_KEY as string,
    jwtSecretRefresh: process.env.SECRET_REFRESH_KEY as string,
    Password: process.env.PASSWORD as string,
    salt: Number(process.env.SALT as string),
    FeaturedLimit: 5, //cantidad de noticias destacadas
    ApiKey: process.env.API_KEY as string,
    ApiHost: process.env.API_HOST as string
}

export default config;