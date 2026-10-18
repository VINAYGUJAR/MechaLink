
const mongoose = require("mongoose");
const EmergencyRequest = require("../models/EmergencyRequest");
const Vehicle = require("../models/Vehicle");
const Mechanic = require("../models/Mechanic");
const CustomerLocation = require("../models/CustomerLocation");

async function createEmergencyRequest(req, res) {
  try {
    const { vehicleId, mechanicId, description } = req.body;
    const radiusKm = Number(req.body.radiusKm ?? 5);

    if (
      !vehicleId ||
      !mechanicId ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vehicle, mechanic, and description are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(vehicleId) ||
      !mongoose.Types.ObjectId.isValid(mechanicId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID or mechanic ID",
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

    // Confirm the vehicle belongs to this customer.
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      owner: req.user.userId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found in your account",
      });
    }

    // Use the customer's saved breakdown address.
    const customerLocation = await CustomerLocation.findOne({
      customer: req.user.userId,
    });

    if (!customerLocation) {
      return res.status(400).json({
        success: false,
        message: "Save your breakdown address before requesting assistance",
      });
    }

    // The selected mechanic must be approved and within the radius.
    const mechanic = await Mechanic.findOne({
      _id: mechanicId,
      verificationStatus: "approved",
      location: {
        $near: {
          $geometry: customerLocation.location,
          $maxDistance: radiusKm * 1000,
        },
      },
    });

    if (!mechanic) {
      return res.status(400).json({
        success: false,
        message: "Mechanic is not approved or is outside your search radius",
      });
    }

    const request = await EmergencyRequest.create({
      customer: req.user.userId,
      vehicle: vehicle._id,
      mechanic: mechanic._id,
      breakdownAddress: customerLocation.address,
      breakdownLocation: customerLocation.location,
      description: description.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Emergency assistance request created",
      request,
    });
  } catch (error) {
    console.error("Create emergency request error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create assistance request",
    });
  }
}


async function getMyEmergencyRequests(req, res) {
  try {
    const requests = await EmergencyRequest.find({
      customer: req.user.userId,
    })
      .populate("vehicle", "make model year registrationNumber")
      .populate("mechanic", "garageName garageAddress services")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get customer requests error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your assistance requests",
    });
  }
}


async function cancelMyEmergencyRequest(req, res) {
  try {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    // Cancel only a pending request owned by this customer.
    const request = await EmergencyRequest.findOneAndUpdate(
      {
        _id: requestId,
        customer: req.user.userId,
        status: "pending",
      },
      {
        $set: { status: "cancelled" },
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
          "Request cannot be cancelled. It may not belong to you or is no longer pending.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assistance request cancelled successfully",
      request,
    });
  } catch (error) {
    console.error("Cancel request error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel assistance request",
    });
  }
}


module.exports = { createEmergencyRequest ,   
                   getMyEmergencyRequests,
                   cancelMyEmergencyRequest,
                };
