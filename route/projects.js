const express = require('express')
const router = express.Router();
const {
    createNewProject,
    getAllRegisterProject,
    getProjectWithProjectCode,
    updateProjectWithProjectCode,
    addEmailWithProjectCode,
    getdeviceIdProjectWise,
    getDeviceCount,
    
} = require('../controller/project');

const {authUser,restrictToRole} = require('../middleware/authenticate');
const { authDevice } = require('../middleware/validate');

// Protected
router.get('/',authUser,getAllRegisterProject);
router.post('/',authUser,restrictToRole,createNewProject)
router.get('/:projectCode',authUser, getProjectWithProjectCode)
router.put('/:projectCode',authUser, updateProjectWithProjectCode)
router.put('/updateEmail/:projectCode', addEmailWithProjectCode)
router.get('/getIds/:projectCode',authUser,getdeviceIdProjectWise)
router.get('/getDeviceCount/:projectCode',authUser,getDeviceCount)

module.exports = router;