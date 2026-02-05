export function authMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.HONEYPOT_API_KEY) {
    return res.status(401).json({
      status: "error",
      message: "Unauthorized"
    });
  }

  next();
}