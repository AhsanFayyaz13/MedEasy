// Simple request body validators
function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter((f) => !req.body[f]);
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireFields };
