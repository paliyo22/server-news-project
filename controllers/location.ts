import type { Request, Response } from 'express';
import { getClientIp, apiLocationData, apiWeatherData } from '../services';

export class LocationController {

    getLocation = async (req: Request, res: Response): Promise<void> => {
        const ip = getClientIp(req);

        if (!ip) {
            res.status(500).json({ error: "Failed to extract IPv4 address" });
            return;
        }

        try {
            const location = await apiLocationData(ip);
            res.status(200).json({ location });
        } catch (e) {
            if (e instanceof Error) {
            res.status(500).json({ error: e.message });
            } else {
            res.status(500).json({ error: "Internal Server Error" });
            }
        }
    };

    getWeather = async(req: Request, res: Response): Promise<void> => {
        const {latitude, longitude, lang} = req.query;

        if(typeof latitude !== 'string' || typeof longitude !== 'string' || typeof lang !== 'string'){
            res.status(400).json({ error: 'Missing or invalid query parameters' });
            return;
        }
        try {
            const weather = await apiWeatherData(latitude, longitude, lang);
            res.status(200).json({ weather });
        } catch (e) {
            if (e instanceof Error) {
            res.status(500).json({ error: e.message });
            } else {
            res.status(500).json({ error: "Internal Server Error" });
            }
        }
 
    }   
}