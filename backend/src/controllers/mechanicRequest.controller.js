
const mongoose = require("mongoose");
const Mechanic = require("../models/Mechanic");
const EmergencyRequest = require("../models/EmergencyRequest");

async function getMyRequests(req, res) {
  try {
    const mechanic = await Mechanic.findOne({
      user: req.user.userId,
    });

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: "Create your mechanic profile first",
      });
    }

    const requests = await EmergencyRequest.find({
      mechanic: mechanic._id,
    })
      .populate("customer", "name phone")
      .populate(
        "vehicle",
        "make model year registrationNumber"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get mechanic requests error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch assistance requests",
    });
  }
}

async function acceptRequest(req, res) {
  try {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const mechanic = await Mechanic.findOne({
      user: req.user.userId,
    });

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: "Mechanic profile not found",
      });
    }

    // Accept only a pending request assigned to this mechanic.
    const request = await EmergencyRequest.findOneAndUpdate(
      {
        _id: requestId,
        mechanic: mechanic._id,
        status: "pending",
      },
      {
        $set: { status: "accepted" },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Pending request not found in your assigned requests",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assistance request accepted",
      request,
    });
  } catch (error) {
    console.error("Accept request error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to accept assistance request",
    });
  }
}


async function updateRequestStatus(req, res) {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
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

    const mechanic = await Mechanic.findOne({
      user: req.user.userId,
    });

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: "Mechanic profile not found",
      });
    }

    // Allow only the correct next status.
    const previousStatus =
      status === "in_progress" ? "accepted" : "in_progress";

    const request = await EmergencyRequest.findOneAndUpdate(
      {
        _id: requestId,
        mechanic: mechanic._id,
        status: previousStatus,
      },
      {
        $set: { status },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!request) {
      return res.status(400).json({
        success: false,
        message:
          "Request not found, not assigned to you, or invalid status transition",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Request status updated to ${status}`,
      request,
    });
  } catch (error) {
    console.error("Update request status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update request status",
    });
  }
}


module.exports = {
  getMyRequests,
  acceptRequest,
  updateRequestStatus,
};
