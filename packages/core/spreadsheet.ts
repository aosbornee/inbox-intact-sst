import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: SCOPES,
});

export const createSpreadsheet = async (
  rows: {
    emailInbox: string;
    testScore: string;
    testLink: string;
    testDate: string;
  }[]
) => {
  const doc = await GoogleSpreadsheet.createNewSpreadsheetDocument(jwt, {
    title: `Deliverability Report For: ${new Date().toISOString()}`,
  });
  await doc.setPublicAccessLevel("reader");

  await doc.sheetsByIndex[0].delete();

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const sheet = await doc.addSheet({ headerValues: headers });

  await sheet.addRows(rows);
  const link = `https://docs.google.com/spreadsheets/d/${doc.spreadsheetId}`;
  return link;
};
