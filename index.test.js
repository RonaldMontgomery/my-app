const request = require("supertest");
const app = require("./index");

test("health check returns ok", async () => {
  const res = await request(app).get("/health");
  expect(res.statusCode).toBe(200);
});