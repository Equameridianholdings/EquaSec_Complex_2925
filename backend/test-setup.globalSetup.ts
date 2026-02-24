import * as db from "#__tests__/integration/db.js";
import app from "#app.js";
import { Server } from "http";

let server: Server;

export default async function setup() {
  await db.connect();
  await new Promise<void>((resolve) => {
    server = app.listen(3000, () => {
      // Start the server
      console.log("Express server listening on port 3000");
      resolve();
    });
  });

  return async function () {
    await db.disconnet();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        // Close the server
        if (err) {
          reject(err);
          return;
        }
        console.log("Express server closed");
        resolve();
      });
    });
  };
}