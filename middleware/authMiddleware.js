const jwt = require("jsonwebtoken");

const verifyAccessToken = (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    // console.log(token, "token--------");
    if (!token) {
      return res.status(401).send({ message: "Access token missing" });
    }

    // verify token
    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) {
        return res
          .status(401)
          .send({ message: "Access token expired or invalid" });
      }
      // console.log(user, "middleware user");
      res.locals.user = user; // attach decoded user payload to request
      next();
    });
  } catch (err) {
    return res.status(500).send({ message: "Internal server error" });
  }
};

module.exports = verifyAccessToken;
