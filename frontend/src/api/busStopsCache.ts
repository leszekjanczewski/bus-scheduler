/**
 * In-memory cache for bus stops.
 *
 * Eliminates the "double-fetch" effect caused by React 18 StrictMode's
 * double-invoke of useEffect in development. The `inflight` deduplication
 * also collapses simultaneous calls (from App + AdminPanel mounting at the
 * same time) into a single HTTP request.
 */

import apiClient from './axiosConfig';
import { API_BASE_URL } from '../config';
import type { BusStopDTO } from '../types';

let cache: BusStopDTO[] | null = null;
let inflight: Promise<BusStopDTO[]> | null = null;

/**
 * Returns bus stops from cache if available, otherwise fetches from API.
 * Concurrent calls during the same inflight request share one promise.
 */
export async function fetchBusStops(): Promise<BusStopDTO[]> {
  if (cache !== null) return cache;
  if (inflight !== null) return inflight;

  inflight = apiClient
    .get<BusStopDTO[]>(`${API_BASE_URL}/busstops`)
    .then((res) => {
      cache = res.data;
      inflight = null;
      return cache;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });

  return inflight;
}

/**
 * Clears the cache. Call this after any mutation (add / edit / delete stop)
 * so the next consumer gets fresh data from the API.
 */
export function invalidateBusStopsCache(): void {
  cache = null;
  inflight = null;
}
