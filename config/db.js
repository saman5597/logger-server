const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config();

const connectDB = async () => { 
    try {
        await mongoose.connect(process.env.MONGO_URI,{
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        console.log("MongoDB connection SUCCESS!");
    } catch (error) {
        console.error("MongoDB connection FAILED!",error);
        process.exit();
    }
}

module.exports = connectDB;     