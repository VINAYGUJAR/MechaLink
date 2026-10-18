
const Mechanic = require("../models/Mechanic");
const geocodeAddress = require("../services/geocoding.service");


async function updateMyLocation(req, res) {
  try {
    const { address } = req.body;

    if (
      typeof address !== "string" ||
      address.trim().length < 5 ||
      address.trim().length > 300
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid garage address",
      });
    }

    const result = await geocodeAddress(address.trim());

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Address not found. Please enter a more complete address",
      });
    }

    const profile = await Mechanic.findOneAndUpdate(
      { user: req.user.userId },
      {
        $set: {
          garageAddress: result.formattedAddress,
          location: {
            type: "Point",
            coordinates: [
              result.longitude,
              result.latitude,
            ],
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Create your mechanic profile first",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Garage address and location saved successfully",
      garageAddress: profile.garageAddress,
      location: profile.location,
    });
  } catch (error) {
    console.error("Update location error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update garage location",
    });
  }
}


async function createMyProfile(req, res) {
  try {
    const { garageName, description, services } = req.body;

    if (
      typeof garageName !== "string" ||
      !garageName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Garage name is required",
      });
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be text",
      });
    }

    if (
      services !== undefined &&
      (!Array.isArray(services) ||
        !services.every(
          (service) =>
            typeof service === "string" &&
            service.trim().length > 0
        ))
    ) {
      return res.status(400).json({
        success: false,
        message: "Services must be a list of non-empty strings",
      });
    }

    const existingProfile = await Mechanic.findOne({
      user: req.user.userId,
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "Mechanic profile already exists",
      });
    }

    const profile = await Mechanic.create({
      user: req.user.userId,
      garageName: garageName.trim(),
      description: description?.trim() || "",
      services: services?.map((service) => service.trim()) || [],
    });

    return res.status(201).json({
      success: true,
      message: "Mechanic profile created and awaiting verification",
      profile,
    });
  } catch (error) {
    console.error("Create mechanic profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create mechanic profile",
    });
  }
}

async function getMyProfile(req, res) {
  try {
    const profile = await Mechanic.findOne({
      user: req.user.userId,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Mechanic profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get mechanic profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve mechanic profile",
    });
  }
}

module.exports = {
  createMyProfile,
  getMyProfile,
  updateMyLocation,
};
