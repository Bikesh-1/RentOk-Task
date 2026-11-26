"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parsePositiveBudget = void 0;

var parsePositiveBudget = function parsePositiveBudget(value) {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "string" && value.trim() === "") {
    return null;
  }

  var budget = Number(value);
  return Number.isFinite(budget) && budget > 0 ? budget : null;
};

exports.parsePositiveBudget = parsePositiveBudget;