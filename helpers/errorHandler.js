const statusCode = require("./statusCode");

function handleError(res, error, message = "Internal server error") {
  console.error(message + ":", error);
  return res
    .status(statusCode.INTERNAL_SERVER_ERROR)
    .send({ status: false, message });
}

module.exports = handleError;
