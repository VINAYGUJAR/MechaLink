export function getNearbyMechanicsParams(coordinates, radiusKm) {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !Number.isFinite(coordinates[0]) ||
    coordinates[0] < -180 ||
    coordinates[0] > 180 ||
    !Number.isFinite(coordinates[1]) ||
    coordinates[1] < -90 ||
    coordinates[1] > 90
  ) {
    throw new Error("Select a valid location before searching for mechanics.");
  }

  return {
    latitude: coordinates[1],
    longitude: coordinates[0],
    radiusKm: Number(radiusKm),
  };
}
