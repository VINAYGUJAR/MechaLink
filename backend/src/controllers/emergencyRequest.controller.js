const { prisma } = require("../config/db");
const findNearbyMechanics = require("../services/nearbyMechanics.service");
const sendPrismaError = require("../utils/prismaErrors");
const { serializeEmergencyRequest } = require("../utils/serializers");

function validRecordId(id) {
  return typeof id === "string" && id.trim().length > 0 && id.length <= 100;
}

async function createEmergencyRequest(req, res) {
  try {
    const { vehicleId, mechanicId, description } = req.body;
    const radiusKm = Number(req.body.radiusKm ?? 5);

    if (
      !validRecordId(vehicleId) ||
      !validRecordId(mechanicId) ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vehicle, mechanic, and description are required",
      });
    }

    if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 50) {
      return res.status(400).json({
        success: false,
        message: "Radius must be between 1 and 50 km",
      });
    }

    if (description.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 1000 characters",
      });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: req.user.userId,
      },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found in your account",
      });
    }

    const customerLocation = await prisma.customerLocation.findUnique({
      where: { customerId: req.user.userId },
    });

    if (!customerLocation) {
      return res.status(400).json({
        success: false,
        message: "Save your breakdown address before requesting assistance",
      });
    }

    const matchingMechanics = await findNearbyMechanics({
      latitude: customerLocation.latitude,
      longitude: customerLocation.longitude,
      radiusKm,
      mechanicId,
      limit: 1,
    });
    const mechanic = matchingMechanics[0];

    if (!mechanic) {
      return res.status(400).json({
        success: false,
        message: "Mechanic is not approved or is outside your search radius",
      });
    }

    const request = await prisma.emergencyRequest.create({
      data: {
        customerId: req.user.userId,
        vehicleId: vehicle.id,
        mechanicId: mechanic.id,
        breakdownAddress: customerLocation.address,
        breakdownLongitude: customerLocation.longitude,
        breakdownLatitude: customerLocation.latitude,
        description: description.trim(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Emergency assistance request created",
      request: serializeEmergencyRequest(request),
    });
  } catch (error) {
    console.error("Create emergency request error:", error.message);
    return sendPrismaError(res, error, "Unable to create assistance request");
  }
}

async function getMyEmergencyRequests(req, res) {
  try {
    const requests = await prisma.emergencyRequest.findMany({
      where: { customerId: req.user.userId },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            registrationNumber: true,
          },
        },
        mechanic: {
          select: {
            id: true,
            userId: true,
            garageName: true,
            garageAddress: true,
            services: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests: requests.map(serializeEmergencyRequest),
    });
  } catch (error) {
    console.error("Get customer requests error:", error.message);
    return sendPrismaError(res, error, "Unable to fetch your assistance requests");
  }
}

async function cancelMyEmergencyRequest(req, res) {
  try {
    const { requestId } = req.params;
    if (!validRecordId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const result = await prisma.emergencyRequest.updateMany({
      where: {
        id: requestId,
        customerId: req.user.userId,
        status: "pending",
      },
      data: { status: "cancelled" },
    });

    if (result.count === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Request cannot be cancelled. It may not belong to you or is no longer pending.",
      });
    }

    const request = await prisma.emergencyRequest.findUnique({
      where: { id: requestId },
    });

    return res.status(200).json({
      success: true,
      message: "Assistance request cancelled successfully",
      request: serializeEmergencyRequest(request),
    });
  } catch (error) {
    console.error("Cancel request error:", error.message);
    return sendPrismaError(res, error, "Unable to cancel assistance request");
  }
}

module.exports = {
  createEmergencyRequest,
  getMyEmergencyRequests,
  cancelMyEmergencyRequest,
};
