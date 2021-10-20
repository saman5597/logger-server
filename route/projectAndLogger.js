const express = require('express')
const router = express.Router();
const {
    createNewProject,
    getAllRegisterProject,
    makeEntriesInDeviceLogger,
    getProjectWithProjectCode,
    updateProjectWithProjectCode,
    getProjectWithFilter,
    getdeviceIdProjectWise,
    getProjectLogs,
    getDeviceCount,
    dateWiseLogCount,
    getLogsCountWithOs,
    getLogsCountWithModelName
    
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
router.get('/getDetail/:projectCode',authUser,getProjectWithFilter)
router.get('/getIds/:projectCode',authUser,getdeviceIdProjectWise)
router.get('/getLogsCount/:projectCode',authUser,getProjectLogs)
router.get('/getDeviceCount/:projectCode',authUser,getDeviceCount)
router.get('/datewiselogcount/:projectCode',dateWiseLogCount)
router.get('/getLogsCountWithOs/:projectCode',authUser,getLogsCountWithOs)
router.get('/getLogsCountWithModelName/:projectCode',authUser,getLogsCountWithModelName)

module.exports = router;