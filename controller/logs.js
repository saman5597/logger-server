const Projects = require("../model/project");
const { getDaysArray } = require("../helper/helperFunctions");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Device = require("../model/device");
const QueryHelper = require("../helper/queryHelper");

const makeEntriesInDeviceLogger = catchAsync(
  async (req, res) => {
    const { project_code } = req.params;
    // check project exist or not
    const findProjectWithCode = await Projects.findOne({ code: project_code });

    if (!findProjectWithCode) {
      throw new AppError(`Project does not exist`, 404); // NJ-changes 13 Apr
    }

    const collectionName = findProjectWithCode.collection_name;

    const modelReference = require(`../model/${collectionName}`);

    const { version, type, log, device } = req.body;

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
      res.status(500).json({
        status: 0,
        data: {
          err: {
            generatedTime: new Date(),
            errMsg: "Project not saved",
            msg: "Project not saved",
            type: "MongodbError",
          },
        },
      });
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

    if (!isLoggerSaved) {
      throw new AppError(`Logger entry failed!`, 500);
    }

    if (log.type == "error") {
      findProjectWithCode.reportEmail.map((email) => {
        const url = `${log.msg}`;

        new Email(email, url).sendCrash();
      });
    }

    res.status(201).json({
      status: 1,
      data: {},
      message: "Successful",
    });
  },
  (err, res) => {
    return res.status(err.statusCode).json({
      status: err.status,
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
);

/**
 * desc     Alert
 * api      POST @/api/logger/logs/alerts/:projectCode
 */
const makeEntriesInAlertLogger = catchAsync(
  async (req, res, next) => {
    const { project_code } = req.params;
    // check project exist or not
    const findProjectWithCode = await Projects.findOne({ code: project_code });

    if (!findProjectWithCode) {
      throw new AppError(`Project does not exist`, 404);
    }
    const collectionName = findProjectWithCode.alert_collection_name;
    const modelReference = require(`../model/${collectionName}`);

    const { did, type, ack } = req.body;

    let arrayOfObjects = [];
    for (let i = 0; i < ack.length; i++) {
      arrayOfObjects.push(ack[i]);
    }

    let dbSavePromise = ack.map(async (ac) => {
      const putDataIntoLoggerDb = await new modelReference({
        did: did,
        ack: {
          msg: ac.msg,
          code: ac.code,
          date: ac.timestamp,
        },
        type: type,
      });

      return putDataIntoLoggerDb.save(putDataIntoLoggerDb);
    });

    let isLoggerSaved = await Promise.allSettled(dbSavePromise);
    if (isLoggerSaved) {
      return res.status(201).json({
        status: 1,
        data: {},
        message: "Successful",
      });
    } else {
      res.status(500).json({
        status: 0,
        data: {
          err: {
            generatedTime: new Date(),
            errMsg: "Log not saved",
            msg: "Log not saved",
            type: "MongodbError",
          },
        },
      });
    }
  },
  (err, res) => {
    return res.status(500).json({
      status: err.status,
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
);

// (    return res.status(500).json({
//       status: err.status,
//       data: {
//         err: {
//           generatedTime: new Date(),
//           errMsg: err.stack,
//           msg: err.message,
//           type: err.name,
//         },
//       },
//     });
//   })
// });

/**
 * desc     get project with filter
 * api      @/api/logger/projects/getDetails/:projectCode
 *
 */

const getProjectWithFilter = catchAsync(
  async (req, res) => {
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
    ).logFilter();
    const countObj = await countObjQuery.query;

    const features = new QueryHelper(
      collectionName.find({ type: req.query.projectType }).populate({
        path: "device",
        select: "did name code manufacturer os",
      }),
      req.query
    )
      .logFilter()
      .sort()
      .paginate();

    logs = await features.query;

    return res.status(200).json({
      status: 1,
      message: "Getting all logs",
      data: { count: countObj.length, pageLimit: logs.length, logs: logs },
    });
  },
  (err, res) => {
    console.log(err);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

/**
 * desc     get project with filter
 * api      @/api/logger/projects/getDetails/:projectCode
 *
 */

const getAlertsWithFilter = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;

    if (!req.query.projectType) {
      throw new AppError(`Project type is required`, 400); // NJ-changes 13 Apr
    }

    const isProjectExist = await Projects.findOne({ code: projectCode });
    if (!isProjectExist) {
      throw new AppError(`Project code invalid`, 404); // NJ-changes 13 Apr
    }

    const collectionName = require(`../model/${isProjectExist.alert_collection_name}.js`);

    let alerts;

    // const totalCount = await collectionName.estimatedDocumentCount({})
    const countObjQuery = new QueryHelper(
      collectionName.find({ type: req.query.projectType }),
      req.query
    ).filter();
    const countObj = await countObjQuery.query;

    const features = new QueryHelper(
      collectionName.find({ type: req.query.projectType }),
      req.query
    )
      .filter()
      .sort()
      .paginate();

    alerts = await features.query;

    // Sending type name instead of type code

    return res.status(200).json({
      status: 1,
      message: "Getting all alerts",
      data: {
        count: countObj.length,
        pageLimit: alerts.length,
        alerts: alerts,
      },
    });
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const crashFreeUsersDatewise = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;

    if (!req.query.projectType) {
    }

    if (!projectCode) {
      throw new AppError(`Project code not provided.`, 400); // NJ-changes 13 Apr
    }
    const projectCollection = await Projects.findOne({ code: projectCode });
    if (!projectCollection) {
      throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
    }
    const collectionName = require(`../model/${projectCollection.collection_name}.js`);

    let dt = new Date(req.query.endDate);
    dt.setDate(dt.getDate() + 1);

    const countResponse = await collectionName.aggregate([
      {
        $match: {
          $and: [
            {
              "log.date": {
                $gte: new Date(req.query.startDate),
                $lte: dt,
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
            {
              "log.date": {
                $gte: new Date(req.query.startDate),
                $lte: dt,
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
              input: getDaysArray(new Date(req.query.startDate), dt),
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
      message: "Crash free users on the basis of date.",
    });
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const crashlyticsData = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;

    if (!req.query.projectType) {
      throw new AppError(`project type is required`, 400); // NJ-changes 13 Apr
    }

    var trimmedLogMsg;
    if (req.query.logMsg.length > 26) {
      trimmedLogMsg = req.query.logMsg.substring(0, 26);
    } else trimmedLogMsg = req.query.logMsg;
    trimmedLogMsg = trimmedLogMsg.replace("[", "");

    if (!projectCode) {
      throw new AppError(`Project code not provided.`, 400); // NJ-changes 13 Apr
    }
    const projectCollection = await Projects.findOne({ code: projectCode });
    if (!projectCollection) {
      throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
    }
    // console.log(projectCollection);
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
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const getErrorCountByOSArchitecture = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;
    const isProjectExist = await Projects.findOne({ code: projectCode });

    if (!req.query.projectType) {
      throw new AppError(`project type is required`, 400); // NJ-changes 13 Apr
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
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const getProjectLogs = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;
    const isProjectExist = await Projects.findOne({ code: projectCode });
    if (!isProjectExist) {
      throw new AppError(`Project code invalid`, 404); // NJ-changes 13 Apr
    }

    if (!req.query.projectType) {
      throw new AppError(`Project type is required`, 400); // NJ-changes 13 Apr
    }

    if (!req.query.startDate || !req.query.endDate) {
      throw new AppError(`Provide start date and end date.`, 400); // NJ-changes 13 Apr
    }

    if (!req.params.projectCode) {
      throw new AppError(`Project type is required`, 400); // NJ-changes 13 Apr
    }

    const collectionName = require(`../model/${isProjectExist.collection_name}.js`);

    let dt = new Date(req.query.endDate);
    dt.setDate(dt.getDate() + 1);

    const typeWiseCount = await collectionName.aggregate([
      {
        $match: {
          "log.date": {
            $gte: new Date(req.query.startDate),
            $lte: dt,
          },
          type: req.query.projectType,
        },
      },
      { $group: { _id: "$log.type", count: { $sum: 1 } } },
      { $project: { logType: "$_id", count: 1, _id: 0 } },
    ]);
    const totalLogCount = await collectionName.aggregate([
      {
        $match: {
          "log.date": {
            $gte: new Date(req.query.startDate),
            $lte: dt,
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
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const dateWiseLogCount = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;

    if (!req.query.projectType) {
      throw new AppError(`Project type is required`, 400); // NJ-changes 13 Apr
    }

    if (!projectCode) {
      throw new AppError(`Project code not provided.`, 400); // NJ-changes 13 Apr
    }
    const projectCollection = await Projects.findOne({ code: projectCode });
    if (!projectCollection) {
      throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
    }
    const collectionName = require(`../model/${projectCollection.collection_name}.js`);

    let dt = new Date(req.query.endDate);
    dt.setDate(dt.getDate() + 1);

    const countResponse = await collectionName.aggregate([
      {
        $match: {
          $and: [
            {
              "log.date": {
                $gte: new Date(req.query.startDate),
                $lte: dt,
              },
            },
            { type: req.query.projectType },
            { "log.type": "error" },
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
          "log.date": {
            $gte: new Date(req.query.startDate),
            $lte: dt,
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
              input: getDaysArray(new Date(req.query.startDate), dt),
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
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const logOccurrences = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;

    if (!req.query.projectType) {
      throw new AppError(`project type is required.`, 400); // NJ-changes 13 Apr
    }

    if (!projectCode) {
      throw new AppError(`Project code not provided.`, 400); // NJ-changes 13 Apr
    }
    const projectCollection = await Projects.findOne({ code: projectCode });
    if (!projectCollection) {
      throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
    }

    if (!req.query.logMsg) {
      throw new AppError(`Log message not provided.`, 400); // NJ-changes 13 Apr
    }

    var trimmedLogMsg;
    if (req.query.logMsg.length > 26) {
      trimmedLogMsg = req.query.logMsg.substring(0, 26);
    } else trimmedLogMsg = req.query.logMsg;
    if (trimmedLogMsg.includes("(") && !trimmedLogMsg.includes(")")) {
      trimmedLogMsg = trimmedLogMsg.concat(")");
    }
    trimmedLogMsg = trimmedLogMsg.replace("[", "");

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
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const getLogsCountWithOs = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;
    if (!projectCode) {
      throw new AppError(`Project code not provided.`, 400); // NJ-changes 13 Apr
    }

    const projectCollection = await Projects.findOne({ code: projectCode });
    if (!projectCollection) {
      throw new AppError(`Project not found.`, 404); // NJ-changes 13 Apr
    }

    const collectionName = require(`../model/${projectCollection.collection_name}.js`);

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

    // console.log(osParticularCount);
    return res.status(200).json({
      status: 1,
      data: {
        deviceCount: osTotalCount,
        osParticularCount: osParticularCount[0].count,
      },
      message: "successfull",
    });
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const getLogsCountWithModelName = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;
    if (!projectCode) {
      throw new AppError(`Project code not provided.`, 400); // NJ-changes 13 Apr
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
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const getlogMsgOccurence = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;

    if (!req.query.projectType) {
      throw new AppError(`project type is required`, 400); // NJ-changes 13 Apr
    }

    if (!projectCode) {
      throw new AppError(`Project code not provided.`, 400); // NJ-changes 13 Apr
    }

    if (!req.query.msg) {
      throw new AppError(`Log message not provided.`, 400); // NJ-changes 13 Apr
    }

    var trimmedLogMsg;
    if (req.query.msg.length > 26) {
      trimmedLogMsg = req.query.msg.substring(0, 26);
    } else trimmedLogMsg = req.query.msg;
    trimmedLogMsg = trimmedLogMsg.replace("[", "");

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
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

const getErrorCountByVersion = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;
    const isProjectExist = await Projects.findOne({ code: projectCode });

    if (!req.query.projectType) {
      throw new AppError(`project type is required`, 400); // NJ-changes 13 Apr
    }

    if (!isProjectExist) {
      throw new AppError(`Project code invalid`, 404); // NJ-changes 13 Apr
    }

    const collectionName = require(`../model/${isProjectExist.collection_name}.js`);
    const typeWiseCount = await collectionName.aggregate([
      { $match: { "log.type": "error", type: req.query.projectType } },
      { $group: { _id: "$version", count: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      status: 1,
      data: {
        typeWiseCount,
      },
      message: "successfull",
    });
  },
  (err, res) => {
    // console.log(`Error : ${err.stack}`);
    return res.status(err.statusCode).json({
      status: err.status,
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
);

module.exports = {
  makeEntriesInDeviceLogger,
  makeEntriesInAlertLogger,
  getProjectWithFilter,
  getAlertsWithFilter,
  crashFreeUsersDatewise,
  crashlyticsData,
  getErrorCountByOSArchitecture,
  getProjectLogs,
  dateWiseLogCount,
  logOccurrences,
  getLogsCountWithOs,
  getLogsCountWithModelName,
  getlogMsgOccurence,
  getErrorCountByVersion,
};
