const { prisma } = require("../config/db");
const findNearbyMechanics = require("../services/nearbyMechanics.service");
const sendPrismaError = require("../utils/prismaErrors");
const { serializeNearbyMechanic } = require("../utils/serializers");

async function findNearbyMechanicsController(req, res) {
  try {
    const radiusKm = Number(req.query.radiusKm ?? 5);

    if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 50) {
      return res.status(400).json({
        success: false,
        message: "Radius must be between 1 and 50 km",
      });
    }

    const latitudeProvided = req.query.latitude !== undefined;
    const longitudeProvided = req.query.longitude !== undefined;

    if (latitudeProvided !== longitudeProvided) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude must be provided together",
      });
    }

    let latitude;
    let longitude;

    if (latitudeProvided) {
      const latitudeInput = req.query.latitude;
      const longitudeInput = req.query.longitude;
      latitude =
        typeof latitudeInput === "string" && latitudeInput.trim()
          ? Number(latitudeInput)
          : Number.NaN;
      longitude =
        typeof longitudeInput === "string" && longitudeInput.trim()
          ? Number(longitudeInput)
          : Number.NaN;

      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide valid location coordinates",
        });
      }
    } else {
      const customerLocation = await prisma.customerLocation.findUnique({
        where: { customerId: req.user.userId },
      });

      if (!customerLocation) {
        return res.status(400).json({
          success: false,
          message: "Select and save a location before searching",
        });
      }

      latitude = customerLocation.latitude;
      longitude = customerLocation.longitude;
    }

    const mechanics = await findNearbyMechanics({
      latitude,
      longitude,
      radiusKm,
      limit: 50,
    });

    return res.status(200).json({
      success: true,
      radiusKm,
      count: mechanics.length,
      mechanics: mechanics.map(serializeNearbyMechanic),
    });
  } catch (error) {
    console.error("Nearby mechanic search error:", error.message);
    return sendPrismaError(res, error, "Unable to find nearby mechanics");
  }
}

module.exports = { findNearbyMechanics: findNearbyMechanicsController };
