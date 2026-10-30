"""Deterministic pure-Python Geohash encoding utilities for VeriCarbon MRV."""

from __future__ import annotations

_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def encode_geohash(lat: float, lon: float, precision: int = 8) -> str:
    """Encode latitude and longitude into a standard base32 geohash string.

    Args:
        lat: Latitude in decimal degrees [-90.0, 90.0].
        lon: Longitude in decimal degrees [-180.0, 180.0].
        precision: Number of characters in the resulting geohash (e.g. 5 for
            spatial-block splitting, 8 for plot-level geoCommitment).

    Returns:
        Geohash string of length ``precision``.
    """
    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"Latitude out of range [-90, 90]: {lat}")
    if not (-180.0 <= lon <= 180.0):
        raise ValueError(f"Longitude out of range [-180, 180]: {lon}")
    if precision <= 0:
        raise ValueError(f"Precision must be positive: {precision}")

    lat_interval = [-90.0, 90.0]
    lon_interval = [-180.0, 180.0]
    geohash: list[str] = []
    bits = [16, 8, 4, 2, 1]
    bit = 0
    ch = 0
    even = True

    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2.0
            if lon >= mid:
                ch |= bits[bit]
                lon_interval[0] = mid
            else:
                lon_interval[1] = mid
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2.0
            if lat >= mid:
                ch |= bits[bit]
                lat_interval[0] = mid
            else:
                lat_interval[1] = mid
        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(_BASE32[ch])
            bit = 0
            ch = 0

    return "".join(geohash)


def parse_aoi(aoi_str: str) -> tuple[float, float, float, float]:
    """Parse ``minLon,minLat,maxLon,maxLat`` string into a 4-tuple of floats."""
    parts = [p.strip() for p in aoi_str.split(",")]
    if len(parts) != 4:
        raise ValueError(
            f"Invalid AOI format '{aoi_str}'. Expected 'minLon,minLat,maxLon,maxLat'."
        )
    min_lon, min_lat, max_lon, max_lat = (
        float(parts[0]),
        float(parts[1]),
        float(parts[2]),
        float(parts[3]),
    )
    if min_lon >= max_lon or min_lat >= max_lat:
        raise ValueError(
            f"Invalid AOI bounds ({min_lon}, {min_lat}, {max_lon}, {max_lat}): "
            "min must be strictly less than max."
        )
    return min_lon, min_lat, max_lon, max_lat


def aoi_to_geohash8(
    min_lon: float, min_lat: float, max_lon: float, max_lat: float
) -> str:
    """Compute the 8-character geohash of the AOI centroid."""
    center_lon = (min_lon + max_lon) / 2.0
    center_lat = (min_lat + max_lat) / 2.0
    return encode_geohash(center_lat, center_lon, precision=8)
