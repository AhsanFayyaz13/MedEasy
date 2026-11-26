/**
 * Appointment dates are stored as midnight UTC of the booked day, so they are formatted in UTC
 * (formatting in Pakistan time could show the day before).
 */
const formatDay = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

module.exports = { formatDay };
