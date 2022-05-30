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

var upload = multer({ storage: storage, limits: { fileSize: maxSize  } });
const router = express.Router();
const {
  makeEntriesInDeviceLogger,
  makeEntriesInDeviceLogger1,
  makeEntriesInAlertLogger,
  getProjectLogs,
  dateWiseLogCount,
  logOccurrences,
  getLogsCountWithOs,
  getLogsCountWithModelName,
  getlogMsgOccurence,
  getErrorCountByOSArchitecture,
  crashlyticsData,
  crashFreeUsersDatewise,
  getProjectWithFilter,
  getAlertsWithFilter,
  getErrorCountByVersion,
} = require("../controller/logs");

const { authUser } = require("../middleware/authenticate");

const { validateHeader } = require("../middleware/validate");

// Unprotected
router.post("/:project_code", makeEntriesInDeviceLogger);
router.post(
  "/v2/:project_code",
  upload.single("filePath"),
  validateHeader,
  makeEntriesInDeviceLogger1
);
router.post("/alerts/:project_code", makeEntriesInAlertLogger);

//Protected Route
router.get("/:projectCode", authUser, getProjectWithFilter);
router.get("/alerts/:projectCode", authUser, getAlertsWithFilter);
router.get(
  "/crashfree-users-datewise/:projectCode",
  authUser,
  crashFreeUsersDatewise
);
router.get("/get-crashlytics-data/:projectCode", authUser, crashlyticsData);
router.get(
  "/getErrorCountByOSArchitecture/:projectCode",
  authUser,
  getErrorCountByOSArchitecture
);
router.get("/getLogsCount/:projectCode", authUser, getProjectLogs);
router.get("/datewiselogcount/:projectCode", authUser, dateWiseLogCount);
router.get("/log-occurrences-datewise/:projectCode", authUser, logOccurrences);
router.get("/getLogsCountWithOs/:projectCode", authUser, getLogsCountWithOs);
router.get(
  "/getLogsCountWithModelName/:projectCode",
  authUser,
  getLogsCountWithModelName
);
router.get("/logMsgOccurence/:projectCode", authUser, getlogMsgOccurence);
router.get(
  "/getErrorCountByVersion/:projectCode",
  authUser,
  getErrorCountByVersion
);

module.exports = router;
