const express = require('express')
const router = express.Router();
const {
    createNewProject,
    getAllRegisterProject,
    makeEntriesInDeviceLogger,
    getProjectWithProjectCode,
    updateProjectWithProjectCode,
    addEmailWithProjectCode,
    getProjectWithFilter,
    getdeviceIdProjectWise,
    getProjectLogs,
    getErrorCountByVersion,
    getDeviceCount,
    dateWiseLogCount,
    logOccurrences,
    crashFreeUsersDatewise,
    crashlyticsData,
    getLogsCountWithOs,
    getLogsCountWithModelName,
    getErrorCountByOSArchitecture,
    getlogMsgOccurence
    
} = require('../controller/project');

const {authUser,restrictToRole} = require('../middleware/authenticate');
const { authDevice } = require('../middleware/validate');

// Unprotected
router.post('/makeLog/:project_code',
// authDevice ,
makeEntriesInDeviceLogger)

// Protected
router.get('/',authUser,getAllRegisterProject);
router.post('/',authUser,restrictToRole,createNewProject)
router.get('/:projectCode',authUser, getProjectWithProjectCode)
router.put('/:projectCode',authUser, updateProjectWithProjectCode)
router.put('/updateEmail/:projectCode', addEmailWithProjectCode)
router.get('/getDetail/:projectCode',authUser,getProjectWithFilter)
router.get('/getIds/:projectCode',authUser,getdeviceIdProjectWise)
router.get('/getLogsCount/:projectCode',authUser,getProjectLogs)
router.get('/getErrorCountByVersion/:projectCode',authUser,getErrorCountByVersion)
router.get('/getDeviceCount/:projectCode',authUser,getDeviceCount)
router.get('/datewiselogcount/:projectCode',authUser,dateWiseLogCount)
router.get('/log-occurrences-datewise/:projectCode',authUser,logOccurrences)
router.get('/crashfree-users-datewise/:projectCode', authUser, crashFreeUsersDatewise)
router.get('/get-crashlytics-data/:projectCode', authUser, crashlyticsData)
router.get('/getErrorCountByOSArchitecture/:projectCode',authUser,getErrorCountByOSArchitecture)
router.get('/getLogsCountWithOs/:projectCode',authUser,getLogsCountWithOs)
router.get('/getLogsCountWithModelName/:projectCode',authUser,getLogsCountWithModelName)
router.get('/logMsgOccurence/:projectCode',authUser,getlogMsgOccurence)


module.exports = router;