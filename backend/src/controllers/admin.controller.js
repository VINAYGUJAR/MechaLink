
const mongoose = require("mongoose");
const Mechanic = require("../models/Mechanic");
const User = require("../models/User");
const EmergencyRequest = require("../models/EmergencyRequest");

async function verifyMechanic(req, res) {
  try {
    const { mechanicId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(mechanicId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mechanic ID",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    const mechanic = await Mechanic.findByIdAndUpdate(
      mechanicId,
      { verificationStatus: status },
      { new: true, runValidators: true }
    );

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: "Mechanic profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Mechanic profile ${status}`,
      profile: mechanic,
    });
  } catch (error) {
    console.error("Mechanic verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify mechanic",
    });
  }
}



async function getMechanics(req, res) {
  try {
    const { status } = req.query;
    const allowedStatuses = ["pending", "approved", "rejected"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status",
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const filter = status ? { verificationStatus: status } : {};
    const total = await Mechanic.countDocuments(filter);

    const mechanics = await Mechanic.find(filter)
      .select(
        "user garageName description services garageAddress verificationStatus createdAt"
      )
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      mechanics,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get mechanics error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch mechanic profiles",
    });
  }
}



async function getUsers(req, res) {
  try {
    const { role } = req.query;
    const allowedRoles = ["customer", "mechanic", "admin"];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const filter = role ? { role } : {};
    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .select("name email phone role createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch users",
    });
  }
}

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalMechanics,
      pendingMechanicApprovals,
      requestCounts,
    ] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "mechanic" }),
      Mechanic.countDocuments({ verificationStatus: "pending" }),
      EmergencyRequest.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const requestsByStatus = {
      pending: 0,
      accepted: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    requestCounts.forEach((item) => {
      requestsByStatus[item._id] = item.count;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalCustomers,
        totalMechanics,
        pendingMechanicApprovals,
        requestsByStatus,
      },
    });
  } catch (error) {
    console.error("Dashboard statistics error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};

module.exports = { verifyMechanic , getMechanics, getUsers,getDashboardStats, };
