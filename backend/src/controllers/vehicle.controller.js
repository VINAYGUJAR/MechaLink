const { prisma } = require("../config/db");
const sendPrismaError = require("../utils/prismaErrors");
const { serializeVehicle } = require("../utils/serializers");

async function addVehicle(req, res) {
  try {
    const {
      make,
      model,
      year,
      registrationNumber,
      vehicleType,
    } = req.body;

    if (
      typeof make !== "string" ||
      !make.trim() ||
      typeof model !== "string" ||
      !model.trim() ||
      year === undefined ||
      typeof registrationNumber !== "string" ||
      !registrationNumber.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Make, model, year and registration number are required",
      });
    }

    const vehicleYear = Number(year);
    if (
      !Number.isInteger(vehicleYear) ||
      vehicleYear < 1900 ||
      vehicleYear > new Date().getFullYear() + 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle year",
      });
    }

    const allowedTypes = ["car", "bike", "scooter", "truck", "other"];
    if (vehicleType !== undefined && !allowedTypes.includes(vehicleType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle type",
      });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        ownerId: req.user.userId,
        make: make.trim(),
        model: model.trim(),
        year: vehicleYear,
        registrationNumber: registrationNumber.trim().toUpperCase(),
        vehicleType: vehicleType || "car",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      vehicle: serializeVehicle(vehicle),
    });
  } catch (error) {
    console.error("Add vehicle error:", error.message);
    return sendPrismaError(res, error, "Unable to add vehicle");
  }
}

async function getMyVehicles(req, res) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { ownerId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles: vehicles.map(serializeVehicle),
    });
  } catch (error) {
    console.error("Get vehicles error:", error.message);
    return sendPrismaError(res, error, "Unable to retrieve vehicles");
  }
}

module.exports = {
  addVehicle,
  getMyVehicles,
};
