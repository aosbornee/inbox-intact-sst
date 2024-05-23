import "dotenv/config"

const { DATABASE_URL, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } =
  process.env;

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

export const environment = {
  DATABASE_URL,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
};
