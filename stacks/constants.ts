import "dotenv/config"

const { DATABASE_URL, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } =
  process.env;

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) throw new Error("Missing DATABASE_URL");
if (!GOOGLE_PRIVATE_KEY) throw new Error("Missing DATABASE_URL");


export const environment = {
  DATABASE_URL,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
};
