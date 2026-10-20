const { prisma } = require("../config/db");
const sendPrismaError = require("../utils/prismaErrors");
const { serializeMechanic } = require("../utils/serializers");

async function verifyMechanic(req, res) {
  try {
    const { mechanicId } = req.params;
    const { status } = req.body;

    if (typeof mechanicId !== "string" || !mechanicId.trim()) {
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

    const mechanic = await prisma.mechanic.findUnique({
      where: { id: mechanicId },
    });

    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: "Mechanic profile not found",
      });
    }

    const updatedMechanic = await prisma.mechanic.update({
      where: { id: mechanicId },
      data: { verificationStatus: status },
    });

    return res.status(200).json({
      success: true,
      message: `Mechanic profile ${status}`,
      profile: serializeMechanic(updatedMechanic),
    });
  } catch (error) {
    console.error("Mechanic verification error:", error.message);
    return sendPrismaError(res, error, "Unable to verify mechanic");
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
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const where = status ? { verificationStatus: status } : {};

    const [total, mechanics] = await Promise.all([
      prisma.mechanic.count({ where }),
      prisma.mechanic.findMany({
        where,
        select: {
          id: true,
          userId: true,
          garageName: true,
          description: true,
          services: true,
          garageAddress: true,
          verificationStatus: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      success: true,
      mechanics: mechanics.map(serializeMechanic),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get mechanics error:", error.message);
    return sendPrismaError(res, error, "Unable to fetch mechanic profiles");
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
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const where = role ? { role } : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      success: true,
      users: users.map((user) => ({
        _id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error.message);
    return sendPrismaError(res, error, "Unable to fetch users");
  }
}

async function getDashboardStats(req, res) {
  try {
    const [
      totalCustomers,
      totalMechanics,
      pendingMechanicApprovals,
      requestCounts,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "customer" } }),
      prisma.user.count({ where: { role: "mechanic" } }),
      prisma.mechanic.count({ where: { verificationStatus: "pending" } }),
      prisma.emergencyRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const requestsByStatus = {
      pending: 0,
      accepted: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const item of requestCounts) {
      requestsByStatus[item.status] = item._count._all;
    }

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
    return sendPrismaError(res, error, "Failed to fetch dashboard statistics");
  }
}

module.exports = {
  verifyMechanic,
  getMechanics,
  getUsers,
  getDashboardStats,
};
