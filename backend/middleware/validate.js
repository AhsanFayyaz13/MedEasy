/**
 * Request validation with Zod.
 *
 *   router.post('/', validate({ body: createOrderSchema, params: idParam }), handler)
 *
 * Parsed (coerced, trimmed, unknown-keys-stripped) values replace the originals,
 * so handlers only ever see validated data.
 */
const AppError = require('../utils/AppError');

function validate(schemas) {
  return (req, res, next) => {
    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ path: i.path.join('.') || part, message: i.message }));
        return next(new AppError(400, details[0]?.message || 'Invalid request', 'VALIDATION_ERROR', details));
      }
      if (part === 'query') {
        // Express 5 exposes req.query as a getter; override it with validated data.
        Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
      } else {
        req[part] = result.data;
      }
    }
    return next();
  };
}

/** Legacy helper kept for compatibility: ensures fields are present and non-empty. */
function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter((f) => req.body?.[f] === undefined || req.body?.[f] === '');
    if (missing.length) return next(new AppError(400, `Missing required fields: ${missing.join(', ')}`));
    return next();
  };
}

module.exports = { validate, requireFields };
