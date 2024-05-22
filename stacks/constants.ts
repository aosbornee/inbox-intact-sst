import "dotenv/config"

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

export const environment = {
  DATABASE_URL,
};
