const apiKey = "487a7a82a64dfb7d8c40d4ffb4bf8bc9"; // Replace with your OpenWeatherMap API key
let currentUnit = "metric"; // Default unit (metric for Celsius)
let currentWeatherData = null; // Store current weather data
let searchHistory = []; // Store search history

// DOM Elements
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const themeToggleBtn = document.getElementById("themeToggle");
const celsiusBtn = document.getElementById("celsiusBtn");
const fahrenheitBtn = document.getElementById("fahrenheitBtn");
const historyList = document.getElementById("historyList");
const weatherInfo = document.querySelector(".weather-info");
const forecastContainer = document.querySelector(".forecast-container");
const searchHistoryContainer = document.querySelector(".search-history");

// Event listeners
searchBtn.addEventListener("click", handleSearch);
locationBtn.addEventListener("click", handleLocationRequest);
themeToggleBtn.addEventListener("click", toggleTheme);
celsiusBtn.addEventListener("click", () => setTemperatureUnit("metric"));
fahrenheitBtn.addEventListener("click", () => setTemperatureUnit("imperial"));

// Handle Enter key press in search input
cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        handleSearch();
    }
});

// Load saved theme and search history
document.addEventListener("DOMContentLoaded", () => {
    // Load saved theme
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Load saved unit
    if (localStorage.getItem("unit") === "imperial") {
        setTemperatureUnit("imperial");
    }
    
    // Load search history
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
        searchHistory = JSON.parse(savedHistory);
        updateSearchHistoryUI();
    }
});

// Handle search button click
function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        showLoader();
        fetchWeather(city);
    } else {
        showAlert("Please enter a city name.");
    }
}

// Handle location button click
function handleLocationRequest() {
    if (navigator.geolocation) {
        showLoader();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                hideLoader();
                showAlert("Unable to retrieve location. Please enable location access.");
            }
        );
    } else {
        showAlert("Geolocation is not supported by this browser.");
    }
}

// Fetch Weather by City Name
async function fetchWeather(city) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${currentUnit}&appid=${apiKey}`
        );

        if (!response.ok) {
            handleApiError(response.status);
            return;
        }

        const data = await response.json();
        currentWeatherData = data;
        updateWeatherUI(data);
        fetchForecast(data.coord.lat, data.coord.lon);
        addToSearchHistory(data.name);
    } catch (error) {
        hideLoader();
        showAlert("Network error. Please check your internet connection.");
    }
}

// Fetch Weather by Coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`
        );

        if (!response.ok) {
            handleApiError(response.status);
            return;
        }

        const data = await response.json();
        currentWeatherData = data;
        updateWeatherUI(data);
        fetchForecast(lat, lon);
        addToSearchHistory(data.name);
    } catch (error) {
        hideLoader();
        showAlert("Network error. Please check your internet connection.");
    }
}

// Fetch 5-day forecast
async function fetchForecast(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`
        );

        if (!response.ok) {
            return;
        }

        const data = await response.json();
        updateForecastUI(data);
    } catch (error) {
        console.error("Failed to fetch forecast:", error);
    } finally {
        hideLoader();
    }
}

// Update Weather UI
function updateWeatherUI(data) {
    // Update city name and date
    document.getElementById("cityName").innerText = data.name;
    document.getElementById("date").innerText = getCurrentDate();
    
    // Update temperature and weather description
    const tempUnit = currentUnit === "metric" ? "°C" : "°F";
    document.getElementById("temperature").innerText = `${Math.round(data.main.temp)}${tempUnit}`;
    document.getElementById("description").innerText = data.weather[0].description;
    
    // Update weather icon
    document.getElementById("weatherIcon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    
    // Update additional metrics
    document.getElementById("feelsLike").innerText = `${Math.round(data.main.feels_like)}${tempUnit}`;
    document.getElementById("humidity").innerText = `${data.main.humidity}%`;
    document.getElementById("windSpeed").innerText = `${data.wind.speed} ${currentUnit === "metric" ? "m/s" : "mph"}`;
    document.getElementById("pressure").innerText = `${data.main.pressure} hPa`;
    
    // Update sunrise and sunset times
    document.getElementById("sunrise").innerText = formatTime(data.sys.sunrise, data.timezone);
    document.getElementById("sunset").innerText = formatTime(data.sys.sunset, data.timezone);
    
    // Show weather info
    weatherInfo.style.display = "block";
}

// Update Forecast UI
function updateForecastUI(data) {
    const forecastDiv = document.getElementById("forecast");
    forecastDiv.innerHTML = "";
    
    // Process forecast data to get one forecast per day (at noon)
    const dailyForecasts = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        // We only want one forecast per day (choose the one closest to noon)
        if (!dailyForecasts[day] || Math.abs(date.getHours() - 12) < Math.abs(new Date(dailyForecasts[day].dt * 1000).getHours() - 12)) {
            dailyForecasts[day] = item;
        }
    });
    
    // Create forecast items (limit to 5 days)
    let count = 0;
    for (const day in dailyForecasts) {
        if (count >= 5) break;
        
        const forecast = dailyForecasts[day];
        const tempUnit = currentUnit === "metric" ? "°C" : "°F";
        
        const forecastItem = document.createElement("div");
        forecastItem.className = "forecast-item";
        forecastItem.innerHTML = `
            <p>${day}</p>
            <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="${forecast.weather[0].description}">
            <p>${Math.round(forecast.main.temp)}${tempUnit}</p>
            <p class="metric-label">${forecast.weather[0].description}</p>
        `;
        
        forecastDiv.appendChild(forecastItem);
        count++;
    }
    
    // Show forecast container
    forecastContainer.style.display = "block";
}

// Add city to search history
function addToSearchHistory(cityName) {
    // Don't add duplicates
    if (!searchHistory.includes(cityName)) {
        // Limit history to 5 items
        if (searchHistory.length >= 5) {
            searchHistory.pop();
        }
        
        searchHistory.unshift(cityName);
        localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
        updateSearchHistoryUI();
    }
}

// Update search history UI
function updateSearchHistoryUI() {
    if (searchHistory.length > 0) {
        historyList.innerHTML = "";
        
        searchHistory.forEach(city => {
            const li = document.createElement("li");
            li.textContent = city;
            li.addEventListener("click", () => {
                cityInput.value = city;
                handleSearch();
            });
            
            const removeBtn = document.createElement("button");
            removeBtn.innerHTML = "×";
            removeBtn.classList.add("remove-btn");
            removeBtn.style.padding = "0 10px";
            removeBtn.style.marginLeft = "10px";
            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                removeFromHistory(city);
            });
            
            li.appendChild(removeBtn);
            historyList.appendChild(li);
        });
        
        searchHistoryContainer.style.display = "block";
    }
}

// Remove city from history
function removeFromHistory(city) {
    searchHistory = searchHistory.filter(item => item !== city);
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
    updateSearchHistoryUI();
}

// Set temperature unit
function setTemperatureUnit(unit) {
    if (currentUnit === unit) return;
    
    currentUnit = unit;
    localStorage.setItem("unit", unit);
    
    // Update UI
    if (unit === "metric") {
        celsiusBtn.classList.add("active");
        fahrenheitBtn.classList.remove("active");
    } else {
        fahrenheitBtn.classList.add("active");
        celsiusBtn.classList.remove("active");
    }
    
    // Refresh weather data if we have current weather
    if (currentWeatherData) {
        showLoader();
        fetchWeather(currentWeatherData.name);
    }
}

// Toggle theme
function toggleTheme() {
    const isDarkMode = document.body.classList.toggle("dark-mode");
    
    if (isDarkMode) {
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem("theme", "dark");
    } else {
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem("theme", "light");
    }
}

// Format time from timestamp
function formatTime(timestamp, timezone) {
    const date = new Date((timestamp + timezone) * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Get current date formatted
function getCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
}

// Show a custom alert
function showAlert(message) {
    const alert = document.createElement("div");
    alert.className = "custom-alert";
    alert.textContent = message;
    alert.style.position = "fixed";
    alert.style.top = "20px";
    alert.style.left = "50%";
    alert.style.transform = "translateX(-50%)";
    alert.style.padding = "15px 20px";
    alert.style.background = "rgba(255, 50, 50, 0.9)";
    alert.style.color = "white";
    alert.style.borderRadius = "10px";
    alert.style.zIndex = "1000";
    
    document.body.appendChild(alert);
    
    // Remove after 3 seconds
    setTimeout(() => {
        alert.style.opacity = "0";
        alert.style.transition = "opacity 0.5s";
        setTimeout(() => {
            document.body.removeChild(alert);
        }, 500);
    }, 3000);
}

// Handle API errors
function handleApiError(status) {
    hideLoader();
    if (status === 404) {
        showAlert("City not found. Please enter a valid city name.");
    } else if (status === 401) {
        showAlert("Invalid API Key! Check your API key in script.js.");
    } else {
        showAlert("Failed to fetch weather data. Try again later.");
    }
}

// Show loader
function showLoader() {
    let loader = document.querySelector(".loader");
    if (!loader) {
        loader = document.createElement("div");
        loader.className = "loader";
        document.querySelector(".container").appendChild(loader);
    }
    loader.style.display = "block";
}

// Hide loader
function hideLoader() {
    const loader = document.querySelector(".loader");
    if (loader) {
        loader.style.display = "none";
    }
}