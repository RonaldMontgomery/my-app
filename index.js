const express = require("express");
const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

if (require.main === module) {
  app.listen(3000, () => console.log("Listening on port 3000"));
}

module.exports = app;