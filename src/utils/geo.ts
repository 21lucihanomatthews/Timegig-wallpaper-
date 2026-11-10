/**
 * Calculate great-circle distance between two points (in kilometers) using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export function getWeatherCondition(code: number): { label: string; icon: string } {
  switch (code) {
    case 0: return { label: 'Clear sky', icon: '☀️' };
    case 1:
    case 2:
    case 3: return { label: 'Partly cloudy', icon: '⛅' };
    case 45:
    case 48: return { label: 'Foggy', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57: return { label: 'Drizzle', icon: '🌧️' };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67: return { label: 'Rain', icon: '🌧️' };
    case 71:
    case 73:
    case 75:
    case 77: return { label: 'Snow', icon: '❄️' };
    case 80:
    case 81:
    case 82: return { label: 'Rain showers', icon: '🌦️' };
    case 95:
    case 96:
    case 99: return { label: 'Thunderstorm', icon: '⚡' };
    default: return { label: 'Pleasant', icon: '🌡️' };
  }
}
