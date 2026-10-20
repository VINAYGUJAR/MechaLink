const { prisma } = require("../config/db");
const sendPrismaError = require("../utils/prismaErrors");
const { geoJsonPoint, serializeMechanic } = require("../utils/serializers");

async function updateMyLocation(req, res) {
  try {
    const { name, address, latitude, longitude } = req.body || {};

    if (
      typeof address !== "string" ||
      address.trim().length < 5 ||
      address.trim().length > 300
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid garage location",
      });
    }

    if (
      (name !== undefined &&
        (typeof name !== "string" || !name.trim() || name.trim().length > 160)) ||
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
        message: "Please select a garage location with valid coordinates",
      });
    }

    const profile = await prisma.mechanic.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Create your mechanic profile first",
      });
    }

    const updatedProfile = await prisma.mechanic.update({
      where: { id: profile.id },
      data: {
        garageAddress: address.trim(),
        longitude,
        latitude,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Garage address and location saved successfully",
      name: name?.trim() || updatedProfile.garageAddress,
      garageAddress: updatedProfile.garageAddress,
      location: geoJsonPoint(updatedProfile.longitude, updatedProfile.latitude),
    });
  } catch (error) {
    console.error("Update location error:", error.message);
    return sendPrismaError(res, error, "Unable to update garage location");
  }
}

async function createMyProfile(req, res) {
  try {
    const { garageName, description, services } = req.body;

    if (
      typeof garageName !== "string" ||
      !garageName.trim() ||
      garageName.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Garage name is required and cannot exceed 100 characters",
      });
    }

    if (
      description !== undefined &&
      (typeof description !== "string" || description.trim().length > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be text of at most 1000 characters",
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

    const existingProfile = await prisma.mechanic.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "Mechanic profile already exists",
      });
    }

    const profile = await prisma.mechanic.create({
      data: {
        userId: req.user.userId,
        garageName: garageName.trim(),
        description: description?.trim() || "",
        services: services?.map((service) => service.trim()) || [],
      },
    });

    return res.status(201).json({
      success: true,
      message: "Mechanic profile created and awaiting verification",
      profile: serializeMechanic(profile),
    });
  } catch (error) {
    console.error("Create mechanic profile error:", error.message);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Mechanic profile already exists",
      });
    }
    return sendPrismaError(res, error, "Unable to create mechanic profile");
  }
}

async function getMyProfile(req, res) {
  try {
    const profile = await prisma.mechanic.findUnique({
      where: { userId: req.user.userId },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Mechanic profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      profile: serializeMechanic(profile),
    });
  } catch (error) {
    console.error("Get mechanic profile error:", error.message);
    return sendPrismaError(res, error, "Unable to retrieve mechanic profile");
  }
}

module.exports = {
  createMyProfile,
  getMyProfile,
  updateMyLocation,
};
