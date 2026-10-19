export interface SupportedLocation {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  defaultTilt: number;
  defaultAzimuth: number;
  isBenchmarkAvailable: boolean;
  benchmarkYear?: number;
  description: string;
  statusBadge: string;
}

export const SUPPORTED_LOCATIONS: SupportedLocation[] = [
  {
    id: "san_francisco",
    name: "San Francisco, CA",
    region: "Northern California, USA",
    latitude: 37.7749,
    longitude: -122.4194,
    defaultTilt: 30.0,
    defaultAzimuth: 180.0,
    isBenchmarkAvailable: true,
    benchmarkYear: 2019,
    description: "Verified 8,760-hour hourly solar PV simulation benchmark dataset based on MERRA-2 atmospheric reanalysis.",
    statusBadge: "Verified Benchmark Available",
  },
  {
    id: "phoenix",
    name: "Phoenix, AZ",
    region: "Southwest Desert, USA",
    latitude: 33.4484,
    longitude: -112.0740,
    defaultTilt: 25.0,
    defaultAzimuth: 180.0,
    isBenchmarkAvailable: false,
    description: "Requires live Renewables.ninja API token (unavailable in deterministic benchmark mode).",
    statusBadge: "Requires Live API Key",
  },
  {
    id: "london",
    name: "London, UK",
    region: "Greater London, United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
    defaultTilt: 35.0,
    defaultAzimuth: 180.0,
    isBenchmarkAvailable: false,
    description: "Requires live Renewables.ninja API token (unavailable in deterministic benchmark mode).",
    statusBadge: "Requires Live API Key",
  },
  {
    id: "berlin",
    name: "Berlin, Germany",
    region: "Central Europe, Germany",
    latitude: 52.5200,
    longitude: 13.4050,
    defaultTilt: 35.0,
    defaultAzimuth: 180.0,
    isBenchmarkAvailable: false,
    description: "Requires live Renewables.ninja API token (unavailable in deterministic benchmark mode).",
    statusBadge: "Requires Live API Key",
  },
  {
    id: "sydney",
    name: "Sydney, Australia",
    region: "New South Wales, Australia",
    latitude: -33.8688,
    longitude: 151.2093,
    defaultTilt: 25.0,
    defaultAzimuth: 0.0,
    isBenchmarkAvailable: false,
    description: "Requires live Renewables.ninja API token (unavailable in deterministic benchmark mode).",
    statusBadge: "Requires Live API Key",
  },
];

export const DEFAULT_BENCHMARK_LOCATION = SUPPORTED_LOCATIONS[0];
