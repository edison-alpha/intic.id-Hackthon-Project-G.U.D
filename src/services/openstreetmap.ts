/**
 * OpenStreetMap Nominatim API Service
 * For venue address autocomplete and geocoding
 */

export interface VenueLocation {
  placeId: string;
  displayName: string;
  name: string;
  address: string;
  lat: string;
  lon: string;
  type: string;
  icon?: string;
}

export interface VenueDetails {
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  lat: string;
  lon: string;
}

// Use proxy in development, direct API in production
const NOMINATIM_BASE_URL = import.meta.env.DEV
  ? '/api/nominatim'
  : 'https://nominatim.openstreetmap.org';

/**
 * Search for venues using OpenStreetMap Nominatim
 */
export const searchVenues = async (query: string): Promise<VenueLocation[]> => {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '10',
      'accept-language': 'en',
    });

    const url = `${NOMINATIM_BASE_URL}/search?${params}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'InticApp/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from Nominatim:', text.substring(0, 200));
      throw new Error('Invalid response from venue search API');
    }

    const data = await response.json();

    return data.map((item: any) => ({
      placeId: item.place_id,
      displayName: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      address: item.display_name,
      lat: item.lat,
      lon: item.lon,
      type: item.type,
      icon: item.icon,
    }));
  } catch (error) {
    console.error('Error searching venues:', error);
    throw error;
  }
};

/**
 * Get detailed venue information by coordinates
 */
export const getVenueDetails = async (lat: string, lon: string): Promise<VenueDetails> => {
  try {
    const params = new URLSearchParams({
      lat,
      lon,
      format: 'json',
      addressdetails: '1',
      'accept-language': 'en',
    });

    const url = `${NOMINATIM_BASE_URL}/reverse?${params}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'InticApp/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from Nominatim:', text.substring(0, 200));
      throw new Error('Invalid response from venue details API');
    }

    const data = await response.json();
    const address = data.address || {};

    return {
      name: data.name || data.display_name.split(',')[0],
      address: data.display_name,
      city: address.city || address.town || address.village,
      state: address.state,
      country: address.country,
      postcode: address.postcode,
      lat,
      lon,
    };
  } catch (error) {
    console.error('Error getting venue details:', error);
    throw error;
  }
};

/**
 * Geocode an address to get coordinates
 */
export const geocodeAddress = async (address: string): Promise<{ lat: string; lon: string } | null> => {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
    });

    const url = `${NOMINATIM_BASE_URL}/search?${params}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'InticApp/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from Nominatim:', text.substring(0, 200));
      return null;
    }

    const data = await response.json();

    if (data.length > 0) {
      return {
        lat: data[0].lat,
        lon: data[0].lon,
      };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};
