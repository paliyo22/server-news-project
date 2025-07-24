import { Router } from "express";
import { LocationController } from "../controllers";

export const locationRoutes = (): Router => {
    
    const locationRouter = Router();
    const locationController = new LocationController();

    locationRouter.get('/', locationController.getLocation);
    locationRouter.get('/weather', locationController.getWeather);

    return locationRouter;
}