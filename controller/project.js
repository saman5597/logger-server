const fs = require("fs");
const Projects = require("../model/project");
const ValidateHelper = require("../helper/validatorMiddleware");

// Unique number
const {
  makeId,
  removeAllSpecialChars,
  checkCollectionName,
} = require("../helper/helperFunctions");
const project = require("../model/project");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

/**
 *
 * @param {*} req
 * @param {*} res
 */

const getAllRegisterProject = catchAsync(
  async (req, res) => {
    const allRgisterProject = await Projects.find();
    return res.status(200).json({
      status: 1,
      data: { data: allRgisterProject },
      message: "Successful",
    });
  },
  (err, res) => {
    // console.log(`Error : ${err}`);
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
 * api      POST @/project_name
 * desc     To create new project
 */

const createNewProject = catchAsync(
  async (req, res) => {
    const { name, description, device_type } = req.body;
    // device type will be  array
    const arrayOfObjects = [];

    const typeCodeArray = [];

    if (device_type.length === 0) {
      throw new AppError(`Please provide atleast one device name!`, 400); // NJ-changes 13 Apr
    }

    //  loop and set the typecode and enum code
    for (let i = 0; i < device_type.length; i++) {
      arrayOfObjects.push({ typeCode: `00${i + 1}`, typeName: device_type[i] });
      typeCodeArray.push(`"00${i + 1}"`);
    }

    const isCollectionExist = await checkCollectionName(name + "_collection");

    if (isCollectionExist) {
      throw new AppError(`Project with provided name already exist!!`, 409); // NJ-changes 13 Apr
    }

    const collection_name =
      removeAllSpecialChars(name).toLowerCase() + "_collection";

    const alert_collection_name =
      "alert_" + removeAllSpecialChars(name).toLowerCase() + "_collection";

    const project = await new Projects({
      name,
      description,
      code: makeId(5),
      device_types: arrayOfObjects,
      collection_name,
      alert_collection_name,
    });
    const savedProject = await project.save(project);
    if (!savedProject) {
      res.status(500).json({
        status: 0,
        data: {
          err: {
            generatedTime: new Date(),
            errMsg: "project not saved",
            msg: "project not saved",
            type: "MongodbError",
          },
        },
      });
    }
    const alertSchemaBlueprint = `
    const mongoose = require('mongoose');
    
        const schemaOptions = {
            timestamps: true,
            toJSON: {
                virtuals: false
            },
            toObject: {
                virtuals: false
            }
        }
        
        const ${alert_collection_name}Schema = new mongoose.Schema(
            {
              did:  {
                type: String,
                required: [true, "Device id is required."],
                // validate: {
                //     validator: function (v) {
                //     return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})|([0-9a-fA-F]{4}\\.[0-9a-fA-F]{4}\\.[0-9a-fA-F]{4})$/.test(
                //         v
                //     );
                //     },
                //     message: "{VALUE} is not a valid device id.",
                // },
            },
                type: {
                  type: String,
                  enum: [${typeCodeArray}],
                  required: [true, "Atleast one model required."]
                },
                ack:{
                    msg: String,
                    code: {
                      type: String,
                      required: [true, 'Code is required']
                    },
                    date: {
                      type: Date,
                      required: [true, 'Date time is required']
                    }
                  }
            },
            schemaOptions
        )

        ${alert_collection_name}Schema.index({'type': 1})
                
        const ${alert_collection_name} = mongoose.model('${alert_collection_name}', ${alert_collection_name}Schema)
        
        module.exports = ${alert_collection_name}
        `;

    fs.writeFile(
      `${__dirname.concat(`/../model/${alert_collection_name}.js`)}`,
      alertSchemaBlueprint,
      {
        encoding: "utf8",
        flag: "w",
        mode: 0o666,
      },
      (err) => {
        if (err) {
          throw new AppError(
            `Some error occurred during alert schema creation`,
            500
          ); // NJ-changes 13 Apr
        }
        // console.log("File written successfully");
      }
    );

    // dynamic schema for logs

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
          throw new AppError(
            `Some error occurred during project schema creation`,
            500
          ); // NJ-changes 13 Apr
        }
        // console.log("File written successfully");
      }
    );

    return res.status(201).json({
      status: 1,
      data: { savedProject: savedProject },
      message: "Project Saved successfully",
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

/**
 * api      GET @api/logger/project/:projectCode
 * @param {project code} req
 * @param {whole project data} res
 */
const getProjectWithProjectCode = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;
    // if not enter projectCode

    if (!projectCode) {
      throw new AppError(`Project code not provided.`, 400); // NJ-changes 13 Apr
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

/**
 * api      POST @api/logger/updateProjectDetail/:projectCode
 * @param {name,
 * description,
 * device_type} req
 * @param {successful} res
 */

const updateProjectWithProjectCode = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;
    const { name, description, device_type } = req.body;

    const getProjectWithProjectCode = await Projects.findOne({
      code: projectCode,
    });

    if (!getProjectWithProjectCode) {
      throw new AppError(`We don't have any project with this code!!.`, 404); // NJ-changes 13 Apr
    }

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
              400
            ); // NJ-changes 13 Apr
          }

          // console.log("File update failed");
        }
      );
    }

    getProjectWithProjectCode.name = name
      ? name
      : getProjectWithProjectCode.name;
    getProjectWithProjectCode.description = description;
    getProjectWithProjectCode.device_types = device_type
      ? addNewElementToArray
      : getProjectWithProjectCode.device_types;
    // Updating Data

    const isGetProjectWithProjectCodeSaved = getProjectWithProjectCode.save();

    if (!isGetProjectWithProjectCodeSaved) {
      throw new AppError(
        `Some error occured during updating the project!!`,
        500
      ); // NJ-changes 13 Apr
    }

    res.status(200).json({
      status: 1,
      data: {},
      message: "Project details Updated!!",
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

const addEmailWithProjectCode = catchAsync(
  async (req, res) => {
    const { projectCode } = req.params;

    const { email } = req.body;
    if (!email) {
      throw new AppError(`No email available.`, 400); // NJ-changes 13 Apr
    }

    let emailError = [];
    email.map((em) => {
      if (!ValidateHelper.ValidateEmail(em)) {
        throw new AppError(`Check entered emails.`, 400); // NJ-changes 13 Apr
      }
      if (!emailError.includes(em)) {
        emailError.push(em);
      }
    });

    const getProjectWithProjectCode = await Projects.findOne({
      code: projectCode,
    });

    if (!getProjectWithProjectCode) {
      throw new AppError(`Project does not exist.`, 404); // NJ-changes 13 Apr
    }

    getProjectWithProjectCode.reportEmail = [...emailError];

    const isGetProjectWithProjectCodeSaved = getProjectWithProjectCode.save();

    if (!isGetProjectWithProjectCodeSaved) {
      throw new AppError(
        `Some error occured during updating the project!!`,
        500
      ); // NJ-changes 13 Apr
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

/**
 * desc     provide log count, logType wise count, log created date
 * api      @/api/logger/projects/getLogsCount/:projectCode
 */

const getDeviceCount = catchAsync(
  async (req, res) => {
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

    const totalUsers = await collectionName.aggregate([
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

    return res.status(200).json({
      status: 1,
      data: {
        projectCreationDate: createdAt,
        currentStatus,
        modelList,
        deviceCount: totalUsers.length || 0,
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
  createNewProject,
  getAllRegisterProject,

  getProjectWithProjectCode,
  updateProjectWithProjectCode,
  addEmailWithProjectCode,
  getDeviceCount,
};
