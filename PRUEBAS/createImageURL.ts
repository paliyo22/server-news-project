import axios from "axios";
import { connection } from "../db/mysql";
import type { ResultSetHeader } from "mysql2";

/**
 * Este archivo solo se utilizo para cargar un campo nuevo en la base de datos.
 * Funciona correctamente y sirvio de base para posteriormente crear el servicio. 
 * 
 * This file was only used to populate a new field in the database.
 * It worked and served as the basis for creating the service later on.
 */

const saveUrls = async (): Promise<void> => {
    try {
        // Trae todas las noticias con thumbnail no nulo
        const [rows] = await connection.query(
            `SELECT * FROM news WHERE thumbnail IS NOT NULL ORDER BY created DESC LIMIT 600 ;`
        ) as [any[], any];

        if (rows.length === 0) {
            console.log("No hay noticias con thumbnail para procesar.");
            return;
        }

        for (const row of rows) {
            const { id, thumbnail } = row;

            if (thumbnail && typeof thumbnail === "string" && thumbnail.trim() !== "") {
                let response;
                try {
                    response = await axios.get(thumbnail, {
                        maxRedirects: 5,
                        validateStatus: () => true
                    });
                } catch (e) {
                    console.log(`Error accediendo al url para id ${id}:`, e instanceof Error ? e.message : e);
                    continue;
                }

                // Obtiene la URL final después de redirecciones
                const finalUrl =
                    response?.request?._redirectable?._currentUrl && typeof response.request._redirectable._currentUrl === "string"
                        ? response.request._redirectable._currentUrl
                        : null;

                // Actualiza image_url solo si se obtuvo una URL final
                if (finalUrl && finalUrl.trim() !== "") {
                    try {
                        const [save] = await connection.query(
                            `UPDATE news SET image_url = ? WHERE id = ?;`,
                            [finalUrl, id]
                        ) as [ResultSetHeader, any];

                        if (save.affectedRows === 0) {
                            console.log(`Error al guardar el nuevo url para id ${id}`);
                        } 
                    } catch (e) {
                        console.log(`Error actualizando la base para id ${id}:`, e instanceof Error ? e.message : e);
                    }
                } else {
                    console.log(`No se pudo obtener la URL final para id ${id}`);
                }
            } else {
                console.log(`No hay thumbnail válido para procesar en id ${id}`);
            }
        }
        console.log("ANDUBO TODO BIEN");
    } catch (e) {
        if (e instanceof Error) {
            console.log(e.message);
        } else {
            console.log("Internal Server Error");
        }
    } finally {
        await connection.end();
    }
};

saveUrls();


