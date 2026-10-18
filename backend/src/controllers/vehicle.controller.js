
const Vehicle = require("../models/Vehicle");

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

    const allowedTypes = [
      "car",
      "bike",
      "scooter",
      "truck",
      "other",
    ];

    if (
      vehicleType !== undefined &&
      !allowedTypes.includes(vehicleType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle type",
      });
    }

    const vehicle = await Vehicle.create({
      owner: req.user.userId,
      make: make.trim(),
      model: model.trim(),
      year: vehicleYear,
      registrationNumber: registrationNumber.trim(),
      vehicleType: vehicleType || "car",
    });

    return res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      vehicle,
    });
  } catch (error) {
    console.error("Add vehicle error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add vehicle",
    });
  }
}

async function getMyVehicles(req, res) {
  try {
    const vehicles = await Vehicle.find({
      owner: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("Get vehicles error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve vehicles",
    });
  }
}

module.exports = {
  addVehicle,
  getMyVehicles,
};
