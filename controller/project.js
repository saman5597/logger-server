const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Projects = require("../model/project");
const Device = require("../model/device");
const QueryHelper = require("../helper/queryHelper");
const ValidateHelper = require("../helper/validatorMiddleware");
const fs = require("fs");
dotenv.config();

// Unique number
const {
  makeid,
  removeAllSpecialChars,
  checkCollectionName,
  getDaysArray,
} = require("../helper/helperFunctions");
const project = require("../model/project");
const { sendCrashEmail } = require("../helper/sendEmail");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
// const { type } = require("express/lib/response");

/**
 *
 * @param {*} req
 * @param {*} res
 */

const getAllRegisterProject = catchAsync(async (req, res, next) => {
  const allRgisterProject = await Projects.find();
  return res.status(200).json({
    status: 1,
    data: { data: allRgisterProject },
    message: "Successful",
  });
});

/**
 * api      POST @/project_name
 * desc     To create new project
 */

const createNewProject = catchAsync(async (req, res, next) => {
  const { name, description, device_type } = req.body;
  // device type will be  array
  const arrayOfObjects = [];

  const typeCodeArray = [];

  if (device_type.length === 0) {
    throw new AppError(`Please provide atleast one device name!`, 404); // NJ-changes 13 Apr
  }

  //  loop and set the typecode and enum code
  for (let i = 0; i < device_type.length; i++) {
    arrayOfObjects.push({ typeCode: `00${i + 1}`, typeName: device_type[i] });
    typeCodeArray.push(`"00${i + 1}"`);
  }

  const isCollectionExist = await checkCollectionName(name + "_collection");

  if (isCollectionExist) {
    throw new AppError(`Project with provided name already exist!!`, 404); // NJ-changes 13 Apr
  }

  const collection_name =
    removeAllSpecialChars(name).toLowerCase() + "_collection";
  const project = await new Projects({
    name,
    description,
    code: makeid(5),
    device_types: arrayOfObjects,
    collection_name,
  });
  const savedProject = await project.save(project);
  if (!savedProject) {
    throw new AppError(`Project not created!!`, 401); // NJ-changes 13 Apr
  }

  // dynamic schema

  const schemaBlueprint = `
    const mongoose = require('mongoose');
    const device = require('./device')
    const logs = require('./logs')
    
        const schemaOptions = {
            timestamps: true,
            toJSON: {
                virtuals: false
            },
            toObject: {
                virtuals: false
            }
        }
        
        const ${collection_name}Schema = new mongoose.Schema(
            {
                version: {
                    type: String,
                    required: [true, 'Log version is required.']
                },
                type: {
                  type: String,
                  enum: [${typeCodeArray}],
                  required: [true, "Atleast one model required."]
                },
                device:{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
                log:logs
            },
            schemaOptions
        )

        ${collection_name}Schema.index({'type': 1})
                
        const ${collection_name} = mongoose.model('${collection_name}', ${collection_name}Schema)
        
        module.exports = ${collection_name}
        `;
  console.log(`${__dirname.concat(`/../model/${collection_name}.js`)}`);
  fs.writeFile(
    `${__dirname.concat(`/../model/${collection_name}.js`)}`,
    schemaBlueprint,
    {
      encoding: "utf8",
      flag: "w",
      mode: 0o666,
    },
    (err) => {
      if (err) {
        throw new AppError(`Some error occured during project creation`, 403); // NJ-changes 13 Apr
      }
      // console.log("File written successfully");
    }
  );

  return res.status(201).json({
    status: 1,
    data: { savedProject: savedProject },
    message: "Project Saved succefully",
  });
});

/**
 * api      GET @api/logger/project/:projectCode
 * @param {project code} req
 * @param {whole project data} res
 */
const getProjectWithProjectCode = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;
  // if not enter projectCode

  if (!projectCode) {
    throw new AppError(`Project code not provided.`, 404); // NJ-changes 13 Apr
  }

  const getProject = await Projects.findOne({ code: projectCode });
  if (!getProject) {
    throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
  }

  res.status(200).json({
    status: 1,
    data: { data: getProject },
    message: "Successful",
  });
});

/**
 * api      POST @api/logger/updateProjectDetail/:projectCode
 * @param {name,
 * description,
 * device_type} req
 * @param {successful} res
 */

const updateProjectWithProjectCode = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;
  const { name, description, device_type } = req.body;

  const getProjectWithProjectCode = await Projects.findOne({
    code: projectCode,
  });

  if (!getProjectWithProjectCode) {
    throw new AppError(`We don't have any project with this code!!.`, 401); // NJ-changes 13 Apr
  }
  // if (!device_type) {
  // }

  // Add new element to array

  const addNewElementToArray = [];
  const newTypeCodeArray = [];
  if (device_type) {
    const getLengthOfExistingDeviceType =
      getProjectWithProjectCode.device_types.length;

    getProjectWithProjectCode.device_types.map((deviceTypes) =>
      addNewElementToArray.push(deviceTypes)
    );

    getProjectWithProjectCode.device_types.map((typeCodes) =>
      newTypeCodeArray.push(`"${typeCodes.typeCode}"`)
    );

    for (let i = 0; i < device_type.length; i++) {
      addNewElementToArray.push({
        typeCode: `00${getLengthOfExistingDeviceType + i + 1}`,
        typeName: device_type[i],
      });
      newTypeCodeArray.push(`"00${getLengthOfExistingDeviceType + i + 1}"`);
    }

    const schemaBlueprint = `
      const mongoose = require('mongoose');
      const device = require('./device')
      const logs = require('./logs')
            
            const schemaOptions = {
                timestamps: true,
                toJSON: {
                    virtuals: false
                },
                toObject: {
                    virtuals: false
                }
            }
            
            const ${getProjectWithProjectCode.collection_name}Schema = new mongoose.Schema(
                {
                  version: {
                    type: String,
                    required: [true, 'Log version is required.']
                },
                type: {
                  type: String,
                  enum: [${typeCodeArray}],
                  required: [true, "Atleast one model required."]
                },
                device:{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
                log:logs
                },
                schemaOptions
                )

                ${getProjectWithProjectCode.collection_name}Schema.index({'type': 1})
                
                const ${getProjectWithProjectCode.collection_name} = mongoose.model('${getProjectWithProjectCode.collection_name}', ${getProjectWithProjectCode.collection_name}Schema)
                
                module.exports = ${getProjectWithProjectCode.collection_name}
                `;

    fs.writeFile(
      `${__dirname.concat(
        `/../model/${getProjectWithProjectCode.collection_name}.js`
      )}`,
      schemaBlueprint,
      {
        encoding: "utf8",
        flag: "w",
        mode: 0o666,
      },
      (err) => {
        if (err) {
          throw new AppError(
            `Some error occured during project updation.`,
            401
          ); // NJ-changes 13 Apr
        }

        // console.log("File update failed");
      }
    );
  }

  getProjectWithProjectCode.name = name ? name : getProjectWithProjectCode.name;
  getProjectWithProjectCode.description = description;
  getProjectWithProjectCode.device_types = device_type
    ? addNewElementToArray
    : getProjectWithProjectCode.device_types;
  // Updating Data

  const isGetProjectWithProjectCodeSaved = getProjectWithProjectCode.save();

  if (!isGetProjectWithProjectCodeSaved) {
    throw new AppError(`Some error occured during updating the project!!`, 401); // NJ-changes 13 Apr
  }

  res.status(200).json({
    status: 1,
    data: {},
    message: "Project details Updated!!",
  });
});

const addEmailWithProjectCode = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;
  console.log(req.body);
  const { email } = req.body;
  if (!email) {
    throw new AppError(`No email available.`, 404); // NJ-changes 13 Apr
  }

  let emailError = [];
  email.map((em) => {
    if (!ValidateHelper.ValidateEmail(em)) {
      throw new AppError(`Check entered emails.`, 404); // NJ-changes 13 Apr
    }
    if (!emailError.includes(em)) {
      emailError.push(em);
    }
  });

  const getProjectWithProjectCode = await Projects.findOne({
    code: projectCode,
  });

  if (!getProjectWithProjectCode) {
    throw new AppError(`Project does not exist.`, 401); // NJ-changes 13 Apr
  }

  getProjectWithProjectCode.reportEmail = [...emailError];

  const isGetProjectWithProjectCodeSaved = getProjectWithProjectCode.save();

  if (!isGetProjectWithProjectCodeSaved) {
    throw new AppError(`Some error occured during updating the project!!`, 400); // NJ-changes 13 Apr
  }

  const emailList = await Projects.findOne(
    {
      code: projectCode,
    },
    { reportEmail: 1, _id: 0 }
  );

  res.status(200).json({
    status: 1,
    data: emailList,
    message: "Project details Updated!!",
  });
});

const makeEntriesInDeviceLogger = catchAsync(async (req, res, next) => {
  const { project_code } = req.params;
  // check project exist or not
  const findProjectWithCode = await Projects.findOne({ code: project_code });

  if (!findProjectWithCode) {
    throw new AppError(`Project does not exist`, 404); // NJ-changes 13 Apr
  }

  const collectionName = findProjectWithCode.collection_name;
  console.log(require(`../model/${collectionName}`));
  const modelReference = require(`../model/${collectionName}`);
  // testprojectmodified_collection

  const {
    version,
    type,
    // logs
    log,
    // device
    device,
  } = req.body;

  //  above details will be put in project tables

  //  Make entries in Device
  const Dvc = await new Device({
    did: device.did,
    name: device.name,
    manufacturer: device.manufacturer,
    os: {
      name: device.os.name,
      type: device.os.type,
    },
    battery: device.battery,
  });

  const isDeviceSaved = await Dvc.save(Dvc);

  if (!isDeviceSaved) {
    throw new AppError(`Device save operation failed!`, 401); // NJ-changes 13 Apr
  }

  const putDataIntoLoggerDb = await new modelReference({
    version: version,
    type: type,
    device: isDeviceSaved._id,
    log: {
      file: log.file,
      date: log.date,
      message: decodeURI(log.msg),
      type: log.type,
    },
  });

  const isLoggerSaved = await putDataIntoLoggerDb.save(putDataIntoLoggerDb);
  // console.log("isLoggerSaved", isLoggerSaved);
  // console.log(putDataIntoLoggerDb);
  if (!isLoggerSaved) {
    throw new AppError(`Logger entry failed!`, 401); // NJ-changes 13 Apr
  }

  // console.log(log.message)
  if (log.type == "error") {
    findProjectWithCode.reportEmail.map((email) => {
      // {msg = 'Hello, ', to='xyz@gmail.com',from = 'support@logcat.com',next})
      sendCrashEmail({ msg: log.msg, to: email, from: "logcat@gmail.com" });
    });
  }

  res.status(201).json({
    status: 1,
    data: {},
    message: "Successful",
  });
});

/**
 * desc     get project with filter
 * api      @/api/logger/projects/getDetails/:projectCode
 *
 */

const getProjectWithFilter = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;

  if (!req.query.projectType) {
    throw new AppError(`Project type is required`, 400); // NJ-changes 13 Apr
  }

  const isProjectExist = await Projects.findOne({ code: projectCode });
  if (!isProjectExist) {
    throw new AppError(`Project code invalid`, 404); // NJ-changes 13 Apr
  }

  const collectionName = require(`../model/${isProjectExist.collection_name}.js`);

  let logs;

  // const totalCount = await collectionName.estimatedDocumentCount({})
  const countObjQuery = new QueryHelper(
    collectionName.find({ type: req.query.projectType }),
    req.query
  ).filter();
  // .logFilter();
  const countObj = await countObjQuery.query;

  const features = new QueryHelper(
    collectionName.find({ type: req.query.projectType }).populate({
      path: "device",
      select: "did name code manufacturer os",
    }),
    req.query
  )
    .filter()
    .sort()
    // .logFilter()
    .paginate();

  // console.log("countObj", features);
  logs = await features.query;

  // Sending type name instead of type code
  isProjectExist.device_types.map((device) => {
    logs.map((obj) => {
      if (device.typeCode === obj.device_types) {
        obj.device_types = `${obj.device_types}|${device.typeName}`;
      }
    });
  });

  return res.json({
    status: 1,
    message: "Successfull ",
    data: { count: countObj.length, pageLimit: logs.length, logs: logs },
  });
});

/**
 *
 * @param {params} req
 * @param {id of all device} res
 * @returns
 */
const getdeviceIdProjectWise = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;
  const isProjectExist = await Projects.findOne({ code: projectCode });
  if (!isProjectExist) {
    throw new AppError(`Project code invalid`, 404); // NJ-changes 13 Apr
  }

  const collectionName = require(`../model/${isProjectExist.collection_name}.js`);
  const listOfId = await collectionName
    .find({})
    .populate("device")
    .select("did");
  return res.status(200).json({
    status: 1,
    data: { deviceIds: listOfId },
    message: "Successful",
  });
});

/**
 * desc     provide log count, logType wise count, log created date
 * api      @/api/logger/projects/getLogsCount/:projectCode
 */

const getProjectLogs = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;
  const isProjectExist = await Projects.findOne({ code: projectCode });
  if (!isProjectExist) {
    throw new AppError(`Project code invalid`, 404); // NJ-changes 13 Apr
  }

  if (!req.query.projectType) {
    throw new AppError(`project type is required`, 404); // NJ-changes 13 Apr
  }

  if (!req.query.startDate || !req.query.endDate) {
    throw new AppError(`Provide start date and end date.`, 404); // NJ-changes 13 Apr
  }

  // console.log("req query",req.params)

  if (!req.params.projectCode) {
    throw new AppError(`project type is required`, 404); // NJ-changes 13 Apr
  }

  const collectionName = require(`../model/${isProjectExist.collection_name}.js`);
  const typeWiseCount = await collectionName.aggregate([
    // {$unwind : '$log'},
    {
      $match: {
        "log.date": {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        },
        type: req.query.projectType,
      },
    },
    { $group: { _id: "$log.type", count: { $sum: 1 } } },
    { $project: { logType: "$_id", count: 1, _id: 0 } },
  ]);
  const totalLogCount = await collectionName.aggregate([
    // {$unwind : '$log'},
    {
      $match: {
        "log.date": {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        },
        type: req.query.projectType,
      },
    },
    { $group: { _id: "null", count: { $sum: 1 } } },
  ]);
  const lastLogEntry = await collectionName.findOne().sort({ createdAt: -1 });

  return res.status(200).json({
    status: 1,
    data: {
      totalLogCount: totalLogCount.length ? totalLogCount[0].count : null,
      typeWiseCount,
      lastLogEntry: lastLogEntry ? lastLogEntry.createdAt : null,
    },
    message: "successfull",
  });
});

const getErrorCountByVersion = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;
  const isProjectExist = await Projects.findOne({ code: projectCode });

  if (!req.query.projectType) {
    throw new AppError(`project type is required`, 404); // NJ-changes 13 Apr
  }

  if (!isProjectExist) {
    throw new AppError(`Project code invalid`, 404); // NJ-changes 13 Apr
  }

  const collectionName = require(`../model/${isProjectExist.collection_name}.js`);
  const typeWiseCount = await collectionName.aggregate([
    { $match: { "log.type": "error", type: req.query.projectType } },
    { $group: { _id: "$version", count: { $sum: 1 } } },
  ]);

  // const typeWiseCount = await collectionName.aggregate([
  //   {
  //     $unwind: '$log'
  //   },
  //     { $match: { 'log.type':"info" } },
  //     { $group: { _id: "$version", count: { $sum: 1 } } },
  //   ]);
  // console.log(typeWiseCount);

  return res.status(200).json({
    status: 1,
    data: {
      typeWiseCount,
    },
    message: "successfull",
  });
});

const getErrorCountByOSArchitecture = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;
  const isProjectExist = await Projects.findOne({ code: projectCode });

  if (!req.query.projectType) {
    throw new AppError(`project type is required`, 404); // NJ-changes 13 Apr
  }

  if (!isProjectExist) {
    throw new AppError(`Project code invalid`, 404); // NJ-changes 13 Apr
  }

  const collectionName = require(`../model/${isProjectExist.collection_name}.js`);
  const typeWiseCount = await collectionName.aggregate([
    { $match: { "log.type": "error", type: req.query.projectType } },
    {
      $lookup: {
        from: "devices",
        localField: "device",
        foreignField: "_id",
        as: "device",
      },
    },
    { $group: { _id: "$device.os.name", count: { $sum: 1 } } },
  ]);

  return res.status(200).json({
    status: 1,
    data: {
      typeWiseCount,
    },
    message: "successfull",
  });
});

const getDeviceCount = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;

  const projectCollection = await Projects.findOne({ code: projectCode });
  if (!projectCollection) {
    throw new AppError(`Project code invalid`, 404); // NJ-changes 13 Apr
  }

  const createdAt = projectCollection.createdAt;

  const currentStatus = projectCollection.status;

  const modelList = projectCollection.device_types;

  const collectionName = require(`../model/${projectCollection.collection_name}.js`);
  if (!collectionName) {
    throw new AppError(`Collection Not Found`, 404); // NJ-changes 13 Apr
  }

  const collection = await collectionName
    .find()
    .populate("device")
    .distinct("device.did");

  return res.status(200).json({
    status: 1,
    data: {
      projectCreationDate: createdAt,
      currentStatus,
      modelList,
      deviceCount: collection.length,
    },
    message: "successfull",
  });
});

const dateWiseLogCount = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;

  if (!req.query.projectType) {
    throw new AppError(`project type is required`, 404); // NJ-changes 13 Apr
  }

  if (!projectCode) {
    throw new AppError(`Project code not provided.`, 404); // NJ-changes 13 Apr
  }
  const projectCollection = await Projects.findOne({ code: projectCode });
  if (!projectCollection) {
    throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
  }
  const collectionName = require(`../model/${projectCollection.collection_name}.js`);
  const countResponse = await collectionName.aggregate([
    // {$unwind : '$log'},
    {
      $match: {
        $and: [
          {
            "log.date": {
              $gte: new Date(req.query.startDate),
              $lte: new Date(req.query.endDate),
            },
          },
          { type: req.query.projectType },
          // {logType: {"$ne": "error"}}
        ],
      },
    },
    {
      $lookup: {
        from: "devices",
        localField: "device",
        foreignField: "_id",
        as: "device",
      },
    },
    {
      $group: {
        _id: "$device.did",
      },
    },
  ]);
  const response = await collectionName.aggregate([
    // {$unwind : '$log'},
    {
      $match: {
        "log.date": {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate),
        },
        "log.type": "error",
        type: req.query.projectType,
      },
    },
    {
      $group: {
        _id: {
          DATE: { $substr: ["$log.date", 0, 10] },
        },
        data: { $sum: 1 },
      },
    },
    // { $sort: { "DATE": -1 } },
    {
      $project: {
        _id: 0,
        date: "$_id.DATE",
        data: 1,
      },
    },
    {
      $group: {
        _id: null,
        stats: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        stats: {
          $map: {
            input: getDaysArray(
              new Date(req.query.startDate),
              new Date(req.query.endDate)
            ),
            as: "date_new",
            in: {
              $let: {
                vars: {
                  dateIndex: { $indexOfArray: ["$stats.date", "$$date_new"] },
                },
                in: {
                  $cond: {
                    if: { $ne: ["$$dateIndex", -1] },
                    then: {
                      $arrayElemAt: ["$stats", "$$dateIndex"],
                    },
                    else: {
                      date: { $substr: [{ $toDate: "$$date_new" }, 0, 10] },
                      data: 0,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $unwind: "$stats",
    },
    {
      $replaceRoot: {
        newRoot: "$stats",
      },
    },
  ]);
  res.status(200).json({
    status: 1,
    data: { response, count: countResponse.length || 0 },
    message: "Log count on the basis of date.",
  });
});

const getLogsCountWithOs = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;
  if (!projectCode) {
    throw new AppError(`Project code not provided.`, 404); // NJ-changes 13 Apr
  }

  const projectCollection = await Projects.findOne({ code: projectCode });
  if (!projectCollection) {
    throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
  }

  const collectionName = require(`../model/${projectCollection.collection_name}.js`);
  // if (!collectionName)
  //   throw {
  //     message: "Project Not Found ",
  //   };

  const osTotalCount = await collectionName.countDocuments();
  const osParticularCount = await collectionName.aggregate([
    {
      $lookup: {
        from: "devices",
        localField: "device",
        foreignField: "_id",
        as: "device",
      },
    },
    { $group: { _id: "$device.os.name", count: { $sum: 1 } } },
    { $project: { osArchitecture: "$_id", count: 1, _id: 0 } },
  ]);

  console.log(osParticularCount);
  return res.status(200).json({
    status: 1,
    data: {
      deviceCount: osTotalCount,
      osParticularCount: osParticularCount[0].count,
    },
    message: "successfull",
  });
});

const getLogsCountWithModelName = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;
  if (!projectCode) {
    throw new AppError(`Project code not provided.`, 404); // NJ-changes 13 Apr
  }

  const projectCollection = await Projects.findOne({ code: projectCode });
  if (!projectCollection) {
    throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
  }

  const collectionName = require(`../model/${projectCollection.collection_name}.js`);
  // if (!collectionName)
  //   throw {
  //     message: "Project Not Found ",
  //   };

  const modelTotalCount = await collectionName.countDocuments();
  const modelNameParticularCount = await collectionName.aggregate([
    {
      $lookup: {
        from: "devices",
        localField: "device",
        foreignField: "_id",
        as: "device",
      },
    },
    { $group: { _id: "$device.name", count: { $sum: 1 } } },
    { $project: { modelName: "$_id", count: 1, _id: 0 } },
  ]);
  return res.status(200).json({
    status: 1,
    data: {
      deviceCount: modelTotalCount,
      modelNameParticularCount: modelNameParticularCount[0].count,
    },
    message: "successfull",
  });
});

const getlogMsgOccurence = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;

  if (!req.query.projectType) {
    throw new AppError(`project type is required`, 404); // NJ-changes 13 Apr
  }

  if (!projectCode) {
    throw new AppError(`Project code not provided.`, 404); // NJ-changes 13 Apr
  }

  // const { msg } = req.query;
  if (!req.query.msg) {
    throw new AppError(`Log message not provided.`, 404); // NJ-changes 13 Apr
  }

  var trimmedLogMsg;
  if (req.query.msg.length > 26) {
    trimmedLogMsg = req.query.msg.substring(0, 26);
  } else trimmedLogMsg = req.query.msg;

  const projectCollection = await Projects.findOne({ code: projectCode });
  if (!projectCollection) {
    throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
  }

  const collectionName = require(`../model/${projectCollection.collection_name}.js`);

  const response = await collectionName.aggregate([
    {
      $match: {
        $and: [
          // {did:req.query.macId },
          { "log.message": { $regex: trimmedLogMsg } },
          { "log.type": "error" },
          { type: req.query.projectType },
        ],
      },
    },
    {
      $lookup: {
        from: "devices",
        localField: "device",
        foreignField: "_id",
        as: "device",
      },
    },
    { $group: { _id: "$device.did", count: { $sum: 1 } } },
  ]);

  return res.status(200).json({
    status: 1,
    data: {
      response,
    },
    message: "successfull",
  });
});

const logOccurrences = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;

  if (!req.query.projectType) {
    throw new AppError(`project type is required.`, 404); // NJ-changes 13 Apr
  }

  if (!projectCode) {
    throw new AppError(`Project code not provided.`, 404); // NJ-changes 13 Apr
  }
  const projectCollection = await Projects.findOne({ code: projectCode });
  if (!projectCollection) {
    throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
  }

  if (!req.query.logMsg) {
    throw new AppError(`Log message not provided.`, 404); // NJ-changes 13 Apr
  }

  var trimmedLogMsg;
  if (req.query.logMsg.length > 26) {
    trimmedLogMsg = req.query.logMsg.substring(0, 26);
  } else trimmedLogMsg = req.query.logMsg;
  if (trimmedLogMsg.includes("(") && !trimmedLogMsg.includes(")")) {
    trimmedLogMsg = trimmedLogMsg.concat(")");
  }
  const collectionName = require(`../model/${projectCollection.collection_name}.js`);
  const response = await collectionName.aggregate([
    {
      $match: {
        $and: [
          // {$unwind : '$log'},
          {
            "log.date": {
              $gte: new Date(req.query.startDate),
              $lte: new Date(req.query.endDate),
            },
          },
          { "log.message": { $regex: trimmedLogMsg } },
          { type: req.query.projectType },
        ],
      },
    },
    {
      $group: {
        _id: {
          DATE: { $substr: ["$log.date", 0, 10] },
        },
        data: { $sum: 1 },
      },
    },
    // { $sort: { "DATE": -1 } },
    {
      $project: {
        _id: 0,
        date: "$_id.DATE",
        data: 1,
      },
    },
    {
      $group: {
        _id: null,
        stats: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        stats: {
          $map: {
            input: getDaysArray(
              new Date(req.query.startDate),
              new Date(req.query.endDate)
            ),
            as: "date_new",
            in: {
              $let: {
                vars: {
                  dateIndex: { $indexOfArray: ["$stats.date", "$$date_new"] },
                },
                in: {
                  $cond: {
                    if: { $ne: ["$$dateIndex", -1] },
                    then: {
                      $arrayElemAt: ["$stats", "$$dateIndex"],
                    },
                    else: {
                      date: { $substr: [{ $toDate: "$$date_new" }, 0, 10] },
                      data: 0,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $unwind: "$stats",
    },
    {
      $replaceRoot: {
        newRoot: "$stats",
      },
    },
  ]);
  res.status(200).json({
    status: 1,
    data: { response },
    message: "Log count per log message on the basis of date.",
  });
});

const crashFreeUsersDatewise = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;

  if (!req.query.projectType) {
  }

  if (!projectCode) {
    throw new AppError(`Project code not provided.`, 404); // NJ-changes 13 Apr
  }
  const projectCollection = await Projects.findOne({ code: projectCode });
  if (!projectCollection) {
    throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
  }
  const collectionName = require(`../model/${projectCollection.collection_name}.js`);
  const countResponse = await collectionName.aggregate([
    {
      $match: {
        $and: [
          // {$unwind : '$log'},
          {
            "log.date": {
              $gte: new Date(req.query.startDate),
              $lte: new Date(req.query.endDate),
            },
          },
          { "log.type": { $ne: "error" } },
          { type: req.query.projectType },
        ],
      },
    },
    {
      $lookup: {
        from: "devices",
        localField: "device",
        foreignField: "_id",
        as: "device",
      },
    },
    {
      $group: {
        _id: "$device.did",
      },
    },
  ]);
  const response = await collectionName.aggregate([
    {
      $match: {
        $and: [
          // {$unwind : '$log'},
          {
            "log.date": {
              $gte: new Date(req.query.startDate),
              $lte: new Date(req.query.endDate),
            },
          },
          { "log.type": { $ne: "error" } },
          { type: req.query.projectType },
        ],
      },
    },
    {
      $lookup: {
        from: "devices",
        localField: "device",
        foreignField: "_id",
        as: "device",
      },
    },
    {
      $group: {
        _id: {
          DATE: { $substr: ["$log.date", 0, 10] },
          did: "$device.did",
        },
        data: { $sum: 1 },
      },
    },
    // // { $sort: { "DATE": -1 } },
    {
      $project: {
        _id: 0,
        date: "$_id.DATE",
        did: "$_id.did",
        data: 1,
      },
    },
    {
      $group: {
        _id: null,
        stats: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        stats: {
          $map: {
            input: getDaysArray(
              new Date(req.query.startDate),
              new Date(req.query.endDate)
            ),
            as: "date_new",
            in: {
              $let: {
                vars: {
                  dateIndex: { $indexOfArray: ["$stats.date", "$$date_new"] },
                },
                in: {
                  $cond: {
                    if: { $ne: ["$$dateIndex", -1] },
                    then: {
                      $arrayElemAt: ["$stats", "$$dateIndex"],
                    },
                    else: {
                      date: { $substr: [{ $toDate: "$$date_new" }, 0, 10] },
                      did: null,
                      data: 0,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $unwind: "$stats",
    },
    {
      $replaceRoot: {
        newRoot: "$stats",
      },
    },
  ]);
  res.status(200).json({
    status: 1,
    data: { response, count: countResponse.length || 0 },
    message: "Log count per log message on the basis of date.",
  });
});

const crashlyticsData = catchAsync(async (req, res, next) => {
  const { projectCode } = req.params;

  if (!req.query.projectType) {
    throw new AppError(`project type is required`, 404); // NJ-changes 13 Apr
  }

  var trimmedLogMsg;
  if (req.query.logMsg.length > 26) {
    trimmedLogMsg = req.query.logMsg.substring(0, 26);
  } else trimmedLogMsg = req.query.logMsg;

  if (!projectCode) {
    throw new AppError(`Project code not provided.`, 404); // NJ-changes 13 Apr
  }
  const projectCollection = await Projects.findOne({ code: projectCode });
  if (!projectCollection) {
    throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
  }
  console.log(projectCollection);
  const collectionName = require(`../model/${projectCollection.collection_name}.js`);
  const versionResponse = await collectionName.aggregate([
    {
      $match: {
        $and: [
          // {$unwind : '$log'},
          {
            "log.date": {
              $gte: new Date(req.query.startDate),
              $lte: new Date(req.query.endDate),
            },
          },
          { "log.message": { $regex: trimmedLogMsg } },
          { type: req.query.projectType },
        ],
      },
    },
    {
      $group: {
        _id: "$version",
        data: { $sum: 1 },
      },
    },
  ]);
  const osArchitectureResponse = await collectionName.aggregate([
    {
      $match: {
        $and: [
          // {$unwind : '$log'},
          {
            "log.date": {
              $gte: new Date(req.query.startDate),
              $lte: new Date(req.query.endDate),
            },
          },
          { "log.message": { $regex: trimmedLogMsg } },
          { type: req.query.projectType },
        ],
      },
    },
    {
      $lookup: {
        from: "devices",
        localField: "device",
        foreignField: "_id",
        as: "device",
      },
    },
    {
      $group: {
        _id: "$device.os.name",
        data: { $sum: 1 },
      },
    },
  ]);
  const modelNameResponse = await collectionName.aggregate([
    {
      $match: {
        $and: [
          // {$unwind : '$log'},
          {
            "log.date": {
              $gte: new Date(req.query.startDate),
              $lte: new Date(req.query.endDate),
            },
          },
          { "log.message": { $regex: trimmedLogMsg } },
          { type: req.query.projectType },
        ],
      },
    },
    {
      $lookup: {
        from: "devices",
        localField: "device",
        foreignField: "_id",
        as: "device",
      },
    },
    {
      $group: {
        _id: "$device.name",
        data: { $sum: 1 },
      },
    },
  ]);
  res.status(200).json({
    status: 1,
    data: { versionResponse, osArchitectureResponse, modelNameResponse },
    message: "Crashlytics data on the basis of date.",
  });
});

module.exports = {
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
  getlogMsgOccurence,
};
