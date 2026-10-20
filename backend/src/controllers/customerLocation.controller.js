const { prisma } = require("../config/db");
const sendPrismaError = require("../utils/prismaErrors");
const { geoJsonPoint } = require("../utils/serializers");

async function saveMyLocation(req, res) {
  try {
    const { name, formattedAddress, latitude, longitude } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 160 ||
      typeof formattedAddress !== "string" ||
      formattedAddress.trim().length < 3 ||
      formattedAddress.trim().length > 300
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid location",
      });
    }

    if (
      typeof latitude !== "number" ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== "number" ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a location with valid coordinates",
      });
    }

    const savedLocation = await prisma.customerLocation.upsert({
      where: { customerId: req.user.userId },
      create: {
        customerId: req.user.userId,
        address: formattedAddress.trim(),
        longitude,
        latitude,
      },
      update: {
        address: formattedAddress.trim(),
        longitude,
        latitude,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Breakdown location saved successfully",
      name: name.trim(),
      address: savedLocation.address,
      formattedAddress: savedLocation.address,
      location: geoJsonPoint(savedLocation.longitude, savedLocation.latitude),
    });
  } catch (error) {
    console.error("Save customer location error:", error.message);
    return sendPrismaError(res, error, "Unable to save breakdown location");
  }
}

async function getMyLocation(req, res) {
  try {
    const savedLocation = await prisma.customerLocation.findUnique({
      where: { customerId: req.user.userId },
    });

    if (!savedLocation) {
      return res.status(404).json({
        success: false,
        message: "No breakdown location saved yet",
      });
    }

    return res.status(200).json({
      success: true,
      name: savedLocation.address,
      address: savedLocation.address,
      formattedAddress: savedLocation.address,
      location: geoJsonPoint(savedLocation.longitude, savedLocation.latitude),
    });
  } catch (error) {
    console.error("Get customer location error:", error.message);
    return sendPrismaError(res, error, "Unable to retrieve breakdown location");
  }
}

module.exports = {
  saveMyLocation,
  getMyLocation,
};
