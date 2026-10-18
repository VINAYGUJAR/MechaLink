
const mongoose = require("mongoose");

const mechanicSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    garageName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    garageAddress : {
       type: String,
       trim: true,
       default: "",
    },

    services: {
      type: [String],
      default: [],
    },
    
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

mechanicSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Mechanic", mechanicSchema);
