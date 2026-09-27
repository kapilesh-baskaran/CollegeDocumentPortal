function isValidRequiredDate(requiredBy) {
  const today = new Date();

  const requiredDate = new Date(requiredBy);

  const minimumDate = new Date(today);
  minimumDate.setDate(today.getDate() + 5);

  today.setHours(0, 0, 0, 0);
  minimumDate.setHours(0, 0, 0, 0);
  requiredDate.setHours(0, 0, 0, 0);

  return requiredDate >= minimumDate;
}

module.exports = {
  isValidRequiredDate
};