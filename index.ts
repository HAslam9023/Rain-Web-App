// Imports the necessary modules and its types
import express, {type Express, type Request, type Response} from 'express';
import axios, {type AxiosResponse} from 'axios';

/**
 * The Express application
 */
const app: Express = express();
/**
 * The port the Express application will listen on.
 */
const port: number = 3000;

/**
 * The array that will hold the location search results.
 */
let searchResults: GeocodeData[] = [];

/**
 * The interface that represents the location data.
 */
interface LocationData
{
    city: string;
    country: string;
}

/**
 * The interface that represents the geocode data.
 */
interface GeocodeData
{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    elevation: number;
    feature_code: string;
    country_code: string
    admin1_id: number;
    admin2_id: number;
    admin3_id: number;
    admin4_id: number;
    timezone: string;
    population: number;
    postcodes: string[];
    country_id: number;
    country: string;
    admin1: string;
    admin2: string;
    admin3: string;
    admin4: string;
}

/**
 * The interface that represents the weather data.
 */
interface WeatherData
{
    latitude: number;
    longitude: number
    generationtime_ms: number;
    utc_offset_seconds: number;
    timezone: string;
    timezone_abbreviation: string;
    elevation: number;
    daily_units: {time: string, rain_sum: string};
    daily: {time: string[], rain_sum: number[]};
}

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

/**
 * Handles the root route.
 * @param _req The request object (not used).
 * @param res The response object.
 */
function getRoot(_req: Request, res: Response): void
{
    res.render("index.ejs");
}

/**
 * Handles the location results route.
 * @param req The request object.
 * @param res The response object.
 */
async function getLocationResults(req: Request, res: Response): Promise<void>
{
    try
    {
        // Retrieves the location data from the request body.
        const locationData: LocationData = req.body;
        // Retrieves the city and country from the location data.
        const location: string = `${locationData.city}, ${locationData.country}`;
        // Retrieves the geocoding data from the Open-Meteo API.
        const response: AxiosResponse<{results: GeocodeData[]}> = await axios.get(
            `https://geocoding-api.open-meteo.com/v1/search?name=${location}`
        );

        searchResults = response.data.results;

        res.render("index.ejs", { searchResults: searchResults });
    }
    catch (error)
    {
        console.error(error);
        res.status(500);
    }
}

/**
 * Handles the rain message route.
 * @param req The request object.
 * @param res The response object.
 */
async function getRainMessage(req: Request, res: Response): Promise<void>
{
    try
    {
        // Retrieves the location data from the request body.
        const location: string = req.body.location;
        // Retrieves the city from the location data.
        const city: string = location.split(', ')[0];
        // Retrieves the country or state from the location data.
        const countryOrState: string = location.split(', ')[1];

        // The latitude of the selected location.
        let latitude: number = 0;
        // The longitude of the selected location.
        let longitude: number = 0;
        for (let i = 0; i < searchResults.length; i++)
        {
            if ((searchResults[i].name === city &&
                    searchResults[i].country === countryOrState)
                || (searchResults[i].name === city &&
                    searchResults[i].admin1 === countryOrState))
            {
                latitude = searchResults[i].latitude;
                longitude = searchResults[i].longitude;

                break;
            }
        }

        // Retrieves the weather data from the Open-Meteo API.
        const response: AxiosResponse<WeatherData> = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
            `&longitude=${longitude}&daily=rain_sum&timezone=auto&forecast_days=1` +
            "&precipitation_unit=inch"
        );
        // The total amount of rain expected in inches.
        const rain_sum: number = response.data.daily.rain_sum[0];

        // The message to display to the user.
        const rainMessage = rain_sum > 0
            ? `It will rain in ${location} today (${rain_sum} in)! 🌧️`
            : `No rain expected in ${latitude} today. ☀️`;

        res.render("index.ejs", {rainMessage: rainMessage});
    }
    catch (error)
    {
        console.error(error);
        res.status(500);
    }
}

/**
 * Logs a message to the console indicating that the server has started.
 */
function logServerStart(): void
{
    console.log(`Server started on port ${port}`);
}

// The root GET route.
app.get('/', getRoot);

// The route for retrieving location search results.
app.post('/location', getLocationResults);

// The route for retrieving and displaying the rain message.
app.post('/rain', getRainMessage);

// Starts the server.
app.listen(port, logServerStart);