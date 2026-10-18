
const CustomerLocation = require("../models/CustomerLocation");
const geocodeAddress = require("../services/geocoding.service");

async function saveMyLocation(req, res) {
  try {
    const { address } = req.body;

    if (
      typeof address !== "string" ||
      address.trim().length < 5 ||
      address.trim().length > 300
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid address",
      });
    }

    const result = await geocodeAddress(address.trim());

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Address not found. Please enter a more complete address",
      });
    }

    const savedLocation = await CustomerLocation.findOneAndUpdate(
      { customer: req.user.userId },
      {
        $set: {
          address: result.formattedAddress,
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
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Breakdown location saved successfully",
      address: savedLocation.address,
      location: savedLocation.location,
    });
  } catch (error) {
    console.error("Save customer location error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to save breakdown location",
    });
  }
}

async function getMyLocation(req, res) {
  try {
    const savedLocation = await CustomerLocation.findOne({
      customer: req.user.userId,
    });

    if (!savedLocation) {
      return res.status(404).json({
        success: false,
        message: "No breakdown location saved yet",
      });
    }

    return res.status(200).json({
      success: true,
      address: savedLocation.address,
      location: savedLocation.location,
    });
  } catch (error) {
    console.error("Get customer location error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve breakdown location",
    });
  }
}

module.exports = {
  saveMyLocation,
  getMyLocation,
};
