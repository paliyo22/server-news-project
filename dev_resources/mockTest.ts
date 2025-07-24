import { NewsModel } from "../models/mysql/news";
import { AuthController, NewsController, UserController } from "../controllers/index";
import type { Request, Response } from "express";
import { connection } from "../db/mysql";
import { AuthModel, UserModel } from "../models/mysql";


const mockRequest = (params = {}, query = {}, body = {}, user= {}) => ({
    params,
    query,
    body,
    user
}) as unknown as Request;

const mockResponse = (): Response => {
    const res = {
        statusCode: 200,
        status(statusCode: number) {
            this.statusCode = statusCode;
            return this;
        },
        json(data: any) {
            console.log("Respuesta JSON:", JSON.stringify(data, null, 2));
            return this;
        },
    } as Response;
    return res;
};

const run = async () => {
    try {
        const aux = new NewsController(new NewsModel());
        await aux.fetchApi(
            mockRequest(),
            mockResponse()
        );
    } catch (e) {
        console.error("Error: NO FUNCA BIEN");
    }finally {
        await connection.end();
    }
};

run();

/*id: "9e0262e1-422a-11f0-ba24-c87f54681d88"
{
"name": "John",
"lastname": "Doe",
"birthday": new Date('2000-01-01'),
"username": "johndoe",
"role": "user",
"email": "john.doe@example.com",
"password": "securePassword123"
}
*/