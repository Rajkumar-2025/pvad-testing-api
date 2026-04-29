const statusCode = require("../helpers/statusCode");
const jwt = require("jsonwebtoken");
const UsersCollection = require("../model/usersSchema");

class authController {
  async checkUserAuth(req, res) {
    try {
      let user = res.locals.user;
      let userData = await UsersCollection.findById(user.userId);
      if (userData) {
        return res
          .status(statusCode.OK)
          .send({ status: true, authenticated: true, data: userData });
      }
      return res
        .status(statusCode.NOT_FOUND)
        .send({ status: false, message: "Cannot found user" });
    } catch (error) {
      console.error("checkUserAuth error", error);
      return res.status(statusCode.FORBIDDEN).send({
        status: false,
        message: "Something went wrong",
      });
    }
  }
  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const accessToken = req.cookies?.accessToken;
      // console.log(
      //   "refreshToken",
      //   refreshToken,
      //   "\n",
      //   "accessToken",
      //   accessToken
      // );
      if (!refreshToken || !accessToken) {
        return res
          .status(statusCode.UNAUTHORIZED)
          .send({ message: "Token missing" });
      }

      jwt.verify(refreshToken, process.env.SECRET_KEY, (err, user) => {
        if (err)
          return res
            .status(statusCode.FORBIDDEN)
            .send({ message: "Invalid refresh token" });
        // console.log(user, "refresh token user");
        const newAccessToken = jwt.sign(
          { userId: user.userId, comp_id: user.comp_id },
          process.env.SECRET_KEY,
          {
            expiresIn: "30m",
          },
        );

        res.cookie("accessToken", newAccessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        });

        return res
          .status(statusCode.OK)
          .send({ message: "Access token refreshed" });
      });
    } catch (error) {
      console.error("refreshToken error", error);
      return res.status(statusCode.FORBIDDEN).send({
        status: false,
        message: "Something went wrong",
      });
    }
  }
}

module.exports = new authController();
