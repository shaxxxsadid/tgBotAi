import configure from 'config';
import axios from 'axios';

let Config = {
    apiKey: "",
    city: "",
    units: ""
}

class OpenWeatherMap {

    constructor(apiKey, city, units) {
        Config.apiKey = apiKey
        Config.city = city
        Config.units = units
    }

    async getWeather(city) {
        const apiKey = Config.apiKey;
        const units = Config.units;

        try {
            const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${units}`);
            const { main, weather } = response.data
            const weatherDescription = weather[0].main
            return (`Погода в городе ${city}:\n\n🌡️Температура:  ${main.temp}°C  ${weatherDescription}\n🍃Ощущается как: ${main.feels_like}°C\n😡Давление: ${main.pressure}мм рт.ст.\n💦Влажность: ${main.humidity}%`)
        } catch (error) {
            console.log(`Не удалось получить информацию о погоде: ${error.message}`);
        }
    }
}

export const openWeatherMap = new OpenWeatherMap(configure.get('OPENWEATHERMAP_KEY'), 'Ростов-на-Дону', 'metric')