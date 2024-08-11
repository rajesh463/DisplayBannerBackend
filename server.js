require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// MySQL connection setup using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database.");
  }
});

let intervalId;
let isTimerActive = false;

// Function to decrement the timer every second
const decrementTimer = () => {
  const query = "SELECT timer FROM banners WHERE id = 1";
  db.query(query, (err, result) => {
    if (err) {
      console.error("Failed to retrieve timer:", err);
    } else {
      let currentTimer = result[0].timer;
      if (currentTimer > 0) {
        currentTimer -= 1;
        const updateQuery = "UPDATE banners SET timer = ? WHERE id = 1";
        db.query(updateQuery, [currentTimer], (err, result) => {
          if (err) {
            console.error("Failed to update timer:", err);
          } else {
            console.log(`Timer updated to ${currentTimer}`);
          }
        });
      } else {
        console.log("Timer has reached zero. Stopping the interval.");
        clearInterval(intervalId);
        isTimerActive = false;
      }
    }
  });
};

// Start or restart the timer interval
const startTimer = () => {
  if (!isTimerActive) {
    intervalId = setInterval(decrementTimer, 1000);
    isTimerActive = true;
    console.log("Timer interval started.");
  }
};

// Get banner details
app.get("/api/banner", (req, res) => {
  const query = "SELECT * FROM banners WHERE id = 1";
  db.query(query, (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(result[0]);
    }
  });
});

// Update banner details
app.post("/api/banner", (req, res) => {
  const { description, timer, link, isVisible } = req.body;
  const query = `
        UPDATE banners SET description = ?, timer = ?, link = ?, isVisible = ? WHERE id = 1
    `;
  db.query(query, [description, timer, link, isVisible], (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json({ message: "Banner updated successfully" });

      // If timer is updated and interval is not active, start it
      if (timer > 0 && !isTimerActive) {
        startTimer();
      }
    }
  });
});

// Initialize the timer on server startup
const initializeTimer = () => {
  const query = "SELECT timer FROM banners WHERE id = 1";
  db.query(query, (err, result) => {
    if (err) {
      console.error("Failed to retrieve timer:", err);
    } else {
      let currentTimer = result[0].timer;
      if (currentTimer > 0) {
        startTimer();
      }
    }
  });
};

// Start the timer on server startup if needed
initializeTimer();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
