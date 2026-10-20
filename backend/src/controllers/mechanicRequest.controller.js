const { prisma } = require("../config/db");
const sendPrismaError = require("../utils/prismaErrors");
const { serializeEmergencyRequest } = require("../utils/serializers");

function validRecordId(id) {
  return typeof id === "string" && id.trim().length > 0 && id.length <= 100;
}

async function getMyRequests(req, res) {
  try {
    const mechanic = await prisma.mechanic.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: "Create your mechanic profile first",
      });
    }

    const requests = await prisma.emergencyRequest.findMany({
      where: { mechanicId: mechanic.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            registrationNumber: true,
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
    console.error("Get mechanic requests error:", error.message);
    return sendPrismaError(res, error, "Unable to fetch assistance requests");
  }
}

async function acceptRequest(req, res) {
  try {
    const { requestId } = req.params;
    if (!validRecordId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const mechanic = await prisma.mechanic.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: "Mechanic profile not found",
      });
    }

    const result = await prisma.emergencyRequest.updateMany({
      where: {
        id: requestId,
        mechanicId: mechanic.id,
        status: "pending",
      },
      data: { status: "accepted" },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending request not found in your assigned requests",
      });
    }

    const request = await prisma.emergencyRequest.findUnique({
      where: { id: requestId },
    });

    return res.status(200).json({
      success: true,
      message: "Assistance request accepted",
      request: serializeEmergencyRequest(request),
    });
  } catch (error) {
    console.error("Accept request error:", error.message);
    return sendPrismaError(res, error, "Unable to accept assistance request");
  }
}

async function updateRequestStatus(req, res) {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!validRecordId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    if (!["in_progress", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be in_progress or completed",
      });
    }

    const mechanic = await prisma.mechanic.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: "Mechanic profile not found",
      });
    }

    const previousStatus = status === "in_progress" ? "accepted" : "in_progress";
    const result = await prisma.emergencyRequest.updateMany({
      where: {
        id: requestId,
        mechanicId: mechanic.id,
        status: previousStatus,
      },
      data: { status },
    });

    if (result.count === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Request not found, not assigned to you, or invalid status transition",
      });
    }

    const request = await prisma.emergencyRequest.findUnique({
      where: { id: requestId },
    });

    return res.status(200).json({
      success: true,
      message: `Request status updated to ${status}`,
      request: serializeEmergencyRequest(request),
    });
  } catch (error) {
    console.error("Update request status error:", error.message);
    return sendPrismaError(res, error, "Unable to update request status");
  }
}

module.exports = {
  getMyRequests,
  acceptRequest,
  updateRequestStatus,
};
