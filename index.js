const express = require("express");
const app = express(); // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

if (require.main === module) {
  app.listen(3000, () => console.log("Listening on port 3000"));
}

module.exports = app;