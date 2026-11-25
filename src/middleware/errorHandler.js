const errorHandler = (error, req, res, next) => {
  console.error("Request error:", error);
  if (res.headersSent) return next(error);
  const status = Number(error.status) || 502;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "The request could not be completed" : (error.message || "Internal server error")
  });
};
export default errorHandler;
