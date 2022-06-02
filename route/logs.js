const express = require("express");
const multer = require("multer");
var maxSize = 1 * 1024 * 1024

// FILE UPLOAD WITH MULTER 
const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});

var upload = multer({ storage: storage, limits: { fileSize: maxSize } });
var uploadFunc = upload.single("filePath")
const router = express.Router();
const {
  createLogs,
  createLogsV2,
  createAlerts,
  getLogsByLogType,
  dateWiseCrashCount,
  dateWiseLogOccurrencesByLogMsg,
  getLogsCountWithOs,
  getLogsCountWithModelName,
  getCrashOccurrenceByLogMsg,
  getErrorCountByOSArchitecture,
  crashlyticsData,
  crashFreeUsersDatewise,
  getProjectWithFilter,
  getAlertsWithFilter,
  getErrorCountByVersion,
} = require("../controller/logs");

const { isAuth } = require("../middleware/authMiddleware");

const { validateHeader } = require("../middleware/validateMiddleware");

// Unprotected
router.post("/:project_code", createLogs);
router.post(
  "/v2/:project_code",
  function (req, res, next) {
    uploadFunc(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        return res.status(400).json({
          status: 0,
          data: {
            err: {
              generatedTime: new Date(),
              errMsg: err.stack,
              msg: err.message,
              type: err.name,
            },
          },
        });
      } else if (err) {
        // An unknown error occurred when uploading.
        return res.status(500).json({
          status: -1,
          data: {
            err: {
              generatedTime: new Date(),
              errMsg: err.stack,
              msg: err.message,
              type: err.name,
            },
          },
        });
      }
      // Everything went fine.
      next()
    })
  },
  validateHeader,
  createLogsV2
);
router.post("/alerts/:project_code", createAlerts);

//Protected Route
router.get("/:projectCode", isAuth, getProjectWithFilter);
router.get("/getLogsCount/:projectCode", isAuth, getLogsByLogType);
router.get("/datewiselogcount/:projectCode", isAuth, dateWiseCrashCount);
router.get(
  "/crashfree-users-datewise/:projectCode",
  isAuth,
  crashFreeUsersDatewise
);
router.get("/alerts/:projectCode", isAuth, getAlertsWithFilter);

router.get("/get-crashlytics-data/:projectCode", isAuth, crashlyticsData);
router.get("/log-occurrences-datewise/:projectCode", isAuth, dateWiseLogOccurrencesByLogMsg);
router.get("/logMsgOccurence/:projectCode", isAuth, getCrashOccurrenceByLogMsg);

// UNUSED ROUTES
router.get("/getLogsCountWithOs/:projectCode", isAuth, getLogsCountWithOs);
router.get(
  "/getLogsCountWithModelName/:projectCode",
  isAuth,
  getLogsCountWithModelName
);
router.get(
  "/getErrorCountByOSArchitecture/:projectCode",
  isAuth,
  getErrorCountByOSArchitecture
);
router.get(
  "/getErrorCountByVersion/:projectCode",
  isAuth,
  getErrorCountByVersion
);

module.exports = router;
