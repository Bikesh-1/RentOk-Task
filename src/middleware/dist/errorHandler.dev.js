"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var errorHandler = function errorHandler(error, req, res, next) {
  console.error("Request error:", error);
  if (res.headersSent) return next(error);
  var status = Number(error.status) || 502;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "The request could not be completed" : error.message || "Internal server error"
  });
};

var _default = errorHandler;
exports["default"] = _default;