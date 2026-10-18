// Returns only approved mechanics whose saved garage locations fall within that distance.
// Limits the results to 50 mechanics.

const Mechanic = require("../models/Mechanic");
const CustomerLocation = require("../models/CustomerLocation");

async function findNearbyMechanics(req, res) {
  try {
    const radiusKm = Number(req.query.radiusKm ?? 5);

    if (
      !Number.isFinite(radiusKm) ||
      radiusKm < 1 ||
      radiusKm > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Radius must be between 1 and 50 km",
      });
    }

    const customerLocation = await CustomerLocation.findOne({
      customer: req.user.userId,
    });

    if (!customerLocation) {
      return res.status(400).json({
        success: false,
        message: "Save your breakdown address before searching",
      });
    }

    const mechanics = await Mechanic.find({
      verificationStatus: "approved",
      location: {
        $near: {
          $geometry: customerLocation.location,
          $maxDistance: radiusKm * 1000,
        },
      },
    })
      .select(
        "garageName description services garageAddress location"
      )
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      radiusKm,
      count: mechanics.length,
      mechanics,
    });
  } catch (error) {
    console.error("Nearby mechanic search error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to find nearby mechanics",
    });
  }
}

module.exports = { findNearbyMechanics };
