require("dotenv").config();

const bcrypt = require("bcryptjs");
const { connectDB, prisma } = require("../config/db");

async function createAdmin() {
  try {
    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error(
        "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env"
      );
    }

    if (
      ADMIN_NAME.trim().length < 2 ||
      ADMIN_NAME.trim().length > 80
    ) {
      throw new Error("Admin name must contain between 2 and 80 characters");
    }

    if (ADMIN_PASSWORD.length < 8) {
      throw new Error("Admin password must be at least 8 characters");
    }

    await connectDB();
    const email = ADMIN_EMAIL.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error(
        "This email already exists. Choose a new email for the admin account."
      );
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        name: ADMIN_NAME.trim(),
        email,
        password: hashedPassword,
        role: "admin",
      },
    });

    console.log("Admin account created successfully.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
