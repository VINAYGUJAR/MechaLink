
const mongoose = require("mongoose");

const customerLocationSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

customerLocationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model(
  "CustomerLocation",
  customerLocationSchema
);
