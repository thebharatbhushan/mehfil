import jwt from "jsonwebtoken";
import { isSuspended, SUSPENDED_MESSAGE } from "../services/suspension.js";

const auth = async (req, res, next) => {

  try {

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId = decoded.userId;

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });

  }

  // A suspended member's existing sessions stop working immediately (the site then signs them out).
  if (await isSuspended(req.userId)) {
    return res.status(401).json({
      success: false,
      suspended: true,
      message: SUSPENDED_MESSAGE
    });
  }

  next();

};

export default auth;
