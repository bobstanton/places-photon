import { loggedRequestUrl as requestUrl } from "places-shared/utils";
import { FixedIntervalRateLimiter } from "places-shared/services";

export const PHOTON_BASE_URL = "https://photon.komoot.io";

const PHOTON_HEADERS = {
  "User-Agent": "ObsidianPlacesPlugin/1.0 (https://github.com/bobstanton/places-photon)",
  "Accept": "application/json"
};

// Photon publishes no quota headers and asks callers to be fair, so requests are
// spaced rather than counted. A self-hosted instance is paced the same way; it
// costs one search per second, and the setting exists to point at one.
const limiter = new FixedIntervalRateLimiter(1100);

export async function photonRequest<T>(baseUrl: string, path: string, params: URLSearchParams): Promise<T> {
  await limiter.wait();
  const root = (baseUrl || PHOTON_BASE_URL).replace(/\/+$/, "");
  const response = await requestUrl({ url: `${root}${path}?${params.toString()}`, method: "GET", headers: PHOTON_HEADERS });

  if (response.status !== 200) {
    throw new Error(`Photon API error: ${response.status}`);
  }

  return response.json as T;
}
