"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _virtualKeyAuth = _interopRequireDefault(require("../middleware/virtualKeyAuth.js"));

var _chatController = require("../controllers/chatController.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var router = _express["default"].Router();

router.post("/chat/completions", _virtualKeyAuth["default"], _chatController.createChatCompletion);
var _default = router;
exports["default"] = _default;