require("dotenv").config();

const express = require("express");
const cors = require("cors");

const companyRoutes = require("./routes/companyRoutes");
const jobRoutes = require("./routes/jobRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const applicationRoutes = require("./routes/applicationRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/company", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/applications", applicationRoutes);

app.get("/", (req, res) => {
  res.send("PlaceMux API Running");
});

module.exports = app;