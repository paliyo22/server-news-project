import { NewsModel } from "../models/mysql/news";
import { AuthController, NewsController, UserController } from "../controllers/index";
import type { Request, Response } from "express";
import { connection } from "../db/mysql";
import { AuthModel, UserModel } from "../models/mysql";

// Mock Request y Response para pruebas
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
        // Add any other methods used by your controller as needed
    } as Response;
    return res;
};

const run = async () => {
    try {
        const aux = new UserController(new UserModel(), new AuthModel());
        // Simula una petición con query params
        await aux.update(
            mockRequest({}, {}, 
                {"password": "securePassword123"}, 
                {"id": "276a47f6-452b-11f0-ba24-c87f54681d88"}),
            mockResponse()
        );
    } catch (e) {
        console.error("Error: NO FUNCA BIEN");
    }finally {
        // Cierra la conexión para terminar el proceso
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