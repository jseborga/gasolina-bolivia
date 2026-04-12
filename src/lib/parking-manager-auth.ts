import { randomBytes } from "node:crypto";

export function createParkingManagerAccessToken() {
  return randomBytes(18).toString("hex");
}
