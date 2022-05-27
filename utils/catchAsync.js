const catchAsync = (fn, errorHandler) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      // console.log("catchaysnc", JSON.stringify(err));
      errorHandler(err, res);
    });
  };
};

module.exports = catchAsync;
