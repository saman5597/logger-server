const mongoose = require('mongoose')
    
        const schemaOptions = {
            timestamps: true,
            toJSON: {
                virtuals: false
            },
            toObject: {
                virtuals: false
            }
        }
        
        const newventilator_collectionSchema = new mongoose.Schema(
            {
                did: {
                    type: String,
                    required: [true, 'Device id is required.'],
                    validate: {
                        validator: function(v) {
                            return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})|([0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4})$/.test(v)
                        },
                        message: '{VALUE} is not a valid device id.'
                    }
                },
                logGeneratedDate: {
                    type: Date,
                    required: [true, 'Log generation date is required.']
                },
                logMsg: {
                    type: String,
                    required: [true, 'Log message is required.']
                },
                device_types: {
                    type: String,
                    enum: ["001","002"],
                    required: [true, "Atleast one model required."]
                },
                logType: {
                    type: String,
                    enum: ["verbose","warn","info","error","debug"],
                    default: "info"
                },
                version: {
                    type: String,
                    required: [true, 'Log version is required.']
                },
                modelName: {
                    type: String,
                    required: [true, 'Log model name is required.']
                },
                osArchitecture: {
                    type: String,
                    required: [true, 'Log OS architecture is required.']
                }
            },
            schemaOptions
        )
                
        const newventilator_collection = mongoose.model('newventilator_collection', newventilator_collectionSchema)
        
        module.exports = newventilator_collection
        