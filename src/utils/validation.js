export const parsePositiveBudget = value => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }

  const budget = Number(value);
  return Number.isFinite(budget) && budget > 0 ? budget : null;
};