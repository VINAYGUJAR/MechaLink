const { prisma } = require("../config/db");

async function findNearbyMechanics({
  latitude,
  longitude,
  radiusKm,
  mechanicId,
  limit = 50,
}) {
  const mechanicIdFilter = mechanicId ?? null;
  const radiusMeters = radiusKm * 1000;

  return prisma.$queryRaw`
    SELECT
      "id",
      "garageName",
      "description",
      "garageAddress",
      "services",
      "longitude",
      "latitude",
      "distanceKm"
    FROM (
      SELECT
        "id",
        "garageName",
        "description",
        "garageAddress",
        "services",
        "longitude",
        "latitude",
        ST_Distance(
          ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          true
        ) / 1000 AS "distanceKm"
      FROM "Mechanic"
      WHERE "verificationStatus" = 'approved'
        AND "latitude" IS NOT NULL
        AND "longitude" IS NOT NULL
        AND (${mechanicIdFilter}::text IS NULL OR "id" = ${mechanicIdFilter})
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radiusMeters},
          true
        )
    ) AS nearby
    ORDER BY "distanceKm" ASC
    LIMIT ${limit}
  `;
}

module.exports = findNearbyMechanics;
