function sendPrismaError(res, error, fallbackMessage, overrides = {}) {
  const knownErrors = {
    P2000: [400, "Input value is too long"],
    P2002: [409, "A record with this value already exists"],
    P2003: [400, "A referenced record does not exist"],
    P2009: [400, "Invalid input"],
    P2011: [400, "A required value is missing"],
    P2012: [400, "A required value is missing"],
    P2021: [503, "Database schema is not ready. Apply migrations and try again."],
    P2023: [400, "Invalid input"],
    P2025: [404, "Record not found"],
    P1001: [503, "Database is unavailable. Check the database connection."],
    P1002: [503, "Database connection timed out. Try again shortly."],
  };
  const code = error?.code || error?.cause?.code;
  const knownError =
    knownErrors[code] ||
    (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"].includes(code)
      ? [503, "Database is unavailable. Check the database connection."]
      : undefined);
  const [status, defaultMessage] = knownError || [500, fallbackMessage];
  const message = overrides[code] || defaultMessage;

  return res.status(status).json({
    success: false,
    message,
  });
}

module.exports = sendPrismaError;
