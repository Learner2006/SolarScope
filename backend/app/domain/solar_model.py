"""Astronomical solar position and irradiance simulation engine.

Architectural Decision:
We intentionally implement an offline physical clear-sky simulation engine.
This allows arbitrary global coordinates to be analyzed without requiring live external API credentials,
avoiding network latency and third-party rate limits during local development and testing.

Trade-off:
Calculations represent theoretical clear-sky irradiance and do not model historical cloud reanalysis.
The engine explicitly identifies this provenance so users never confuse celestial geometry
with empirical weather reanalysis.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from typing import Any, Dict, Tuple


def format_coordinates(latitude: float, longitude: float) -> str:
    """Format latitude and longitude with standard cardinal hemisphere indicators."""
    lat_cardinal = "N" if latitude >= 0 else "S"
    lon_cardinal = "E" if longitude >= 0 else "W"
    return f"{abs(latitude):.4f}° {lat_cardinal}, {abs(longitude):.4f}° {lon_cardinal}"


def simulate_astronomical_pv(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
    tilt_degrees: float = 30.0,
    azimuth_degrees: float = 180.0,
    system_loss: float = 0.10,
) -> Tuple[Dict[str, Dict[str, float]], float, int]:
    """Simulate hourly solar generation (kW) for 1 kW rated capacity across specified period.

    Parameters
    ----------
    latitude : float
        Latitude in decimal degrees (-90.0 to +90.0).
    longitude : float
        Longitude in decimal degrees (-180.0 to +180.0).
    start_date : date
        Start of analysis period.
    end_date : date
        End of analysis period.
    tilt_degrees : float
        Panel tilt from horizontal in degrees.
    azimuth_degrees : float
        Panel azimuth orientation in degrees (180 = South, 0 = North).
    system_loss : float
        Fractional derating (e.g. 0.10 for 10% losses).

    Returns
    -------
    Tuple[Dict[str, Dict[str, float]], float, int]
        (hourly_timeseries, total_generation_kwh, interval_count)
    """
    lat_rad = math.radians(latitude)
    tilt_rad = math.radians(tilt_degrees)
    azim_rad = math.radians(azimuth_degrees)

    curr = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time().replace(second=0, microsecond=0))

    data: Dict[str, Dict[str, float]] = {}
    total_kwh = 0.0
    intervals = 0

    # Assumption:
    # We approximate local solar time from geographic longitude (15 degrees per hour).
    # While this omits civil timezone boundaries and Equation of Time orbital eccentricity (+/-15 min),
    # it provides sufficient solar altitude accuracy for hourly feasibility screening without requiring tzdata lookups.
    tz_hour_offset = longitude / 15.0

    while curr <= end_dt:
        intervals += 1
        day_of_year = curr.timetuple().tm_yday
        hour = curr.hour

        local_solar_hour = (hour + tz_hour_offset) % 24.0

        # Celestial solar declination (Spencer / Cooper approximation)
        declination_deg = 23.45 * math.sin(math.radians(360.0 / 365.0 * (day_of_year - 81)))
        declination_rad = math.radians(declination_deg)

        # Solar hour angle omega (15 degrees per hour relative to solar noon)
        ha_deg = (local_solar_hour - 12.0) * 15.0
        ha_rad = math.radians(ha_deg)

        # Architectural Decision / 3D Vector Geometry:
        # We calculate solar position and incidence angle using local East-North-Up (ENU) unit vectors.
        # This eliminates trigonometric branch ambiguities, singularity near zenith/poles, and
        # cleanly enforces standard azimuth convention (North=0°, East=90°, South=180°, West=270°).
        # Sun position vector s:
        # s_e = -cos(delta) * sin(omega)
        # s_n = cos(phi) * sin(delta) - sin(phi) * cos(delta) * cos(omega)
        # s_u = sin(phi) * sin(delta) + cos(phi) * cos(delta) * cos(omega)
        s_e = -math.cos(declination_rad) * math.sin(ha_rad)
        s_n = math.cos(lat_rad) * math.sin(declination_rad) - math.sin(lat_rad) * math.cos(declination_rad) * math.cos(ha_rad)
        s_u = math.sin(lat_rad) * math.sin(declination_rad) + math.cos(lat_rad) * math.cos(declination_rad) * math.cos(ha_rad)

        # Solar elevation angle alpha (geometric altitude above horizon)
        sin_elev = s_u

        if sin_elev > 0.015:
            elev_rad = math.asin(sin_elev)
            elev_deg = math.degrees(elev_rad)

            # Panel surface normal vector n in ENU coordinates:
            # tilt_rad (beta): tilt angle from horizontal (0 = horizontal, pi/2 = vertical)
            # azim_rad (gamma): clockwise from North (0 = North, pi/2 = East, pi = South, 3pi/2 = West)
            n_e = math.sin(tilt_rad) * math.sin(azim_rad)
            n_n = math.sin(tilt_rad) * math.cos(azim_rad)
            n_u = math.cos(tilt_rad)

            # Angle of incidence theta between solar vector and panel normal: cos(theta) = s . n
            # Mathematically equivalent to Duffie & Beckman (2013) with clockwise azimuth from North.
            cos_inc = max(0.0, s_e * n_e + s_n * n_n + s_u * n_u)

            # Trade-off:
            # We use the Kasten & Young (1989) empirical formulation for atmospheric optical air mass.
            # It remains numerically stable even at low solar elevation angles (near horizon) where
            # naive secant formulas diverge to infinity.
            air_mass = 1.0 / max(0.02, (sin_elev + 0.50572 * pow(elev_deg + 6.07995, -1.6364)))

            # Direct beam and circumsolar diffuse clear sky irradiance (kW/m^2)
            irradiance_direct = 1.05 * pow(0.72, pow(air_mass, 0.678)) * cos_inc
            irradiance_diffuse = 0.12 * sin_elev
            irradiance_total = irradiance_direct + irradiance_diffuse

            # Weird Looking Code / Heuristic:
            # Clear-sky irradiance is modulated by an empirical seasonal clarity factor (hemisphere-dependent cosine).
            # Future Improvement:
            # Replace this heuristic with localized Linke turbidity coefficients or aerosol optical depth (AOD) lookups
            # once regional atmospheric tables are integrated.
            hemisphere_offset = 150 if latitude >= 0 else 330
            season_clarity = 0.88 + 0.10 * math.cos(
                math.radians(360.0 / 365.0 * (day_of_year - hemisphere_offset))
            )

            power_kw = round(
                max(0.0, irradiance_total * (1.0 - system_loss) * season_clarity), 3
            )
        else:
            power_kw = 0.0

        ts_str = curr.strftime("%Y-%m-%d %H:%M")
        data[ts_str] = {"electricity": power_kw}
        total_kwh += power_kw
        curr += timedelta(hours=1)

    return data, round(total_kwh, 2), intervals
