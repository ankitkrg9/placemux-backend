require("dotenv").config();

const express = require("express");
const cors = require("cors");

const companyRoutes = require("./routes/companyRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/company", companyRoutes);

app.get("/", (req, res) => {
  res.send("PlaceMux API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});