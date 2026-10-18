const cors = require("cors");
const express = require("express");
const authRoutes = require("./routes/auth.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const mechanicRoutes = require("./routes/mechanic.routes");
const adminRoutes = require("./routes/admin.routes");
const customerLocationRoutes = require("./routes/customerLocation.routes");
const customerRoutes = require("./routes/customer.routes");
const assistanceRequestRoutes = require("./routes/assistanceRequest.routes");
const mechanicRequestRoutes = require("./routes/mechanicRequest.routes");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
}));
// Allow the backend to read JSON request data
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/mechanics", mechanicRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/customer-location", customerLocationRoutes);
app.use("/api/customer", customerRoutes);
app.use(
  "/api/customer/assistance-requests",
  assistanceRequestRoutes
);
app.use(
  "/api/mechanics/assistance-requests",
  mechanicRequestRoutes
);



// Check whether the backend is running
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mecalink backend is running",
  });
});

module.exports = app;
