const express = require("express");
const cors = require("cors");
const { getConnection } = require("./db");
require("dotenv").config();
const app = express();
// =====================================
// Middleware
// =====================================

app.use(cors());
app.use(express.json());
// =====================================
// Test API
// =====================================
app.get("/", (req, res) => {
res.json({
message: "MUTEMP API Server Running",
});
});