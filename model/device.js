const mongoose = require("mongoose");

const osSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "OS name is required"],
  },
  // version: {
  //   type: String,
  //   required: [true, "OS version is required"],
  // },
  type: {
    type: String,
    enum: ["Linux", "Windows", "MacOS", "Other"],
  },
});

const deviceSchema = mongoose.Schema(
  {
    did: {
      type: String,
      required: [true, "Device id is required."],
      validate: {
        validator: function (v) {
          return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})|([0-9a-fA-F]{4}\\.[0-9a-fA-F]{4}\\.[0-9a-fA-F]{4})$/.test(
            v
          );
        },
        message: "{VALUE} is not a valid device id.",
      },
    },
    name: {
      type: String,
      required: [true, "Device name is required."],
    },
    code: {
      type: String,
      //   required: [true, "Device code is required."],
      default: null,
    },
    manufacturer: {
      type: String,
    },
    os: {
      name: {
        type: String,
        required: [true,]
      },
      type: {
        type: String,
        enum: ["linux", "windows", "iOS", "other"]
      },

    },
    battery: {
      type: String,
      default: null,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

const device = mongoose.model("Device", deviceSchema);

module.exports = device;
