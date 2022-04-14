const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const upload = require("express-fileupload");
const bodyParser = require("body-parser");
const connectDB = require("./config/db.js");
const morgan = require("morgan");
const globalErrorHandler = require("./controller/errorController");
const AppError = require("./utils/appError.js");

dotenv.config();

// importing router
const users = require("./route/users.js");
const projectAndLogger = require("./route/projectAndLogger");

// creating connection with DB
connectDB();

const app = express();
app.enable("trust proxy");

// development environment morgan logs
if (process.env.NODE_ENV === "development") {
  app.use(morgan("tiny"));
}

app.use(cors());
app.use(upload()); // for multipart data type
app.use(express.static("public"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, defaultCharset: "utf-8" }));

app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.use("/api/logger", users);

app.use("/api/logger/projects", projectAndLogger);
app.use("/api/logger/users", users);

app.get("/", (req, res) => {
  res.send("hello from api of Logger!");
});

// error handling for all routes which are not define
app.all('*', (req, res, next) => {
  next(
    new AppError(`Can't find ${req.originalUrl} on this server.`, 404)
  );
});
// GLOBAL ERROR HANDLING
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`active on port ${PORT}`));

// unhandleRejection Error handling
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  process.exit(1);
});
