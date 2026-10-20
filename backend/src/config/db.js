
const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL || "",
    max: 10,
    connectionTimeoutMillis: 10000,
  }),
});

async function connectDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from backend/.env");
  }

  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log("PostgreSQL connected successfully");
}

module.exports = { connectDB, prisma };
