import jwt from "jsonwebtoken";

// Same token format as middleware/authMiddleware.js ({ userId }), but never rejects:
// a missing/invalid token just means "guest". Sets req.userId only for a valid token.
const optionalAuth = (req, _res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.userId) req.userId = decoded.userId;
    } catch {
      /* invalid or expired → guest */
    }
  }
  next();
};

export default optionalAuth;
