const express = require('express')
const router = express.Router();
const {
    makeEntriesInDeviceLogger,
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
    getErrorCountByVersion   
} = require('../controller/project');

const {authUser,restrictToRole} = require('../middleware/authenticate');
const { authDevice } = require('../middleware/validate');

// Unprotected
router.post('/:project_code',makeEntriesInDeviceLogger)
router.post('/alerts/:project_code',makeEntriesInAlertLogger)

//Protected Route
router.get('/:projectCode',authUser,getProjectWithFilter)
router.get('/alerts/:projectCode',getAlertsWithFilter)
router.get('/crashfree-users-datewise/:projectCode', authUser, crashFreeUsersDatewise)
router.get('/get-crashlytics-data/:projectCode', authUser, crashlyticsData)
router.get('/getErrorCountByOSArchitecture/:projectCode',authUser,getErrorCountByOSArchitecture)
router.get('/getLogsCount/:projectCode',authUser,getProjectLogs)
router.get('/datewiselogcount/:projectCode',authUser,dateWiseLogCount)
router.get('/log-occurrences-datewise/:projectCode',authUser,logOccurrences)
router.get('/getLogsCountWithOs/:projectCode',authUser,getLogsCountWithOs)
router.get('/getLogsCountWithModelName/:projectCode',authUser,getLogsCountWithModelName)
router.get('/logMsgOccurence/:projectCode',authUser,getlogMsgOccurence)
router.get('/getErrorCountByVersion/:projectCode',authUser,getErrorCountByVersion)


module.exports = router;