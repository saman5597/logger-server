const express =  require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const cors = require('cors')
const connectDB = require('./config/db.js')
const morgan = require('morgan')

dotenv.config();

// importing router
const users = require('./route/users.js')
const projectAndLogger = require('./route/projectAndLogger')

// creating connection with DB
connectDB();


const app = express();
app.enable('trust proxy')
app.use(morgan('tiny'))
app.use(cors())
app.use(express.json({limit:"30mb",extended:true}))
app.use(express.urlencoded({limit:"30mb",extended:true}))

app.use('/api/logger', users)

app.use('/api/logger/projects',projectAndLogger)

app.get('/',(req,res)=>{res.send("hello from api of Logger!")})

const PORT =  process.env.PORT || 5000

app.listen(PORT, ()=> console.log(`active on port ${PORT}`))