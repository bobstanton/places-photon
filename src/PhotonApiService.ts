import { Place } from "places-shared/place";
import { Coordinate, PlacesBoundingBox } from "places-shared/geo";
import { IPlaceExtensionSettings } from "places-shared/settings";
import { IPlacesService, lookupPlaceWithNearOrInQuery, parseNearQuery } from "places-shared/services";
import { logger } from "places-shared/utils";
import { PHOTON_BASE_URL, photonRequest } from "./PhotonClient";

const ATTRIBUTION = "© OpenStreetMap contributors";
const DEFAULT_LIMIT = 10;

// Photon answers with GeoJSON: coordinates in the geometry, everything else in
// properties. `extent` is [minLon, maxLat, maxLon, minLat] when present.
interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
    extent?: [number, number, number, number];
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

export class PhotonApiService implements IPlacesService {
  constructor(private readonly extensionSettings: IPlaceExtensionSettings) {}

  private get baseUrl(): string {
    return this.extensionSettings.baseUrl?.trim() || PHOTON_BASE_URL;
  }

  private baseParams(limit = DEFAULT_LIMIT): URLSearchParams {
    const params = new URLSearchParams({ limit: String(limit) });
    const language = this.extensionSettings.language?.trim();

    if (language) params.set("lang", language);

    return params;
  }

  async lookupPlace(query: string): Promise<Place[]> {
    return lookupPlaceWithNearOrInQuery(query, {
      search: searchQuery => this.executeSearch(searchQuery),
      geocodeLocation: (location, mode) => this.geocodeLocationBounds(location, mode),
      searchInBounds: (searchQuery, bounds) => this.lookupPlaceInBounds(searchQuery, bounds),
      combineFallbackQuery: (poi, location) => `${poi}, ${location}`,
      filterBoundedResults: true
    });
  }

  async lookupPlaceByCoordinates(coordinate: Coordinate): Promise<Place[]> {
    const params = this.baseParams(1);

    params.set("lat", String(coordinate.latitude));
    params.set("lon", String(coordinate.longitude));
    const data = await photonRequest<PhotonResponse>(this.baseUrl, "/reverse", params);

    return (data.features ?? []).map(feature => this.toPlace(feature)).filter((place): place is Place => place !== null);
  }

  // Photon has no bounded-search flag; `bbox` biases results without excluding
  // them, so the caller's filterBoundedResults does the excluding.
  async lookupPlaceInBounds(query: string, bounds: PlacesBoundingBox): Promise<Place[]> {
    try {
      const parsed = parseNearQuery(query);
      const searchQuery = parsed ? `${parsed.poi}, ${parsed.location}` : query;
      const params = this.baseParams();

      params.set("q", searchQuery);
      params.set("bbox", `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`);
      const data = await photonRequest<PhotonResponse>(this.baseUrl, "/api/", params);

      return (data.features ?? []).map(feature => this.toPlace(feature)).filter((place): place is Place => place !== null);
    } catch (error) {
      logger.scope('Places').error('[Photon] lookupPlaceInBounds error:', error);

      throw error;
    }
  }

  private async executeSearch(query: string): Promise<Place[]> {
    const params = this.baseParams();

    params.set("q", query);
    const data = await photonRequest<PhotonResponse>(this.baseUrl, "/api/", params);

    return (data.features ?? []).map(feature => this.toPlace(feature)).filter((place): place is Place => place !== null);
  }

  private async geocodeLocationBounds(location: string, mode: 'near' | 'in'): Promise<{ bounds: PlacesBoundingBox } | null> {
    const params = this.baseParams(1);

    params.set("q", location);
    const data = await photonRequest<PhotonResponse>(this.baseUrl, "/api/", params);
    const extent = data.features?.[0]?.properties?.extent;

    if (!extent) return null;

    const [minLng, maxLat, maxLng, minLat] = extent;
    const bounds = new PlacesBoundingBox(minLat, minLng, maxLat, maxLng);

    if (mode === 'near') {
      bounds.applyPadding(0.5);
    }

    return { bounds };
  }

  private toPlace(feature: PhotonFeature): Place | null {
    const coordinates = feature.geometry?.coordinates;
    const properties = feature.properties;

    if (!coordinates || !properties) return null;
    const [longitude, latitude] = coordinates;

    const street = [properties.housenumber, properties.street].filter(Boolean).join(" ");
    const address = [street, properties.city, properties.state, properties.postcode, properties.country]
      .filter(Boolean)
      .join(", ");

    return {
      name: properties.name || street || properties.city || "",
      latitude,
      longitude,
      address,
      city: properties.city || properties.district || properties.county || "",
      country: properties.country || "",
      state: properties.state || "",
      postalCode: properties.postcode || "",
      website: "",
      tags: [properties.osm_key, properties.osm_value].filter((tag): tag is string => Boolean(tag)),
      source: "photon",
      attribution: ATTRIBUTION
    };
  }
}
