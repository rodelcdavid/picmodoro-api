// import express from "express";
// import cors from "cors";
// import pkg from "pg";
require("dotenv").config();
const express = require("express");
var cors = require("cors");

const { Pool } = require("pg");
const app = express();

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  port: "5432",
  password: "admin",
  database: "picmodoro",
});
// const { Pool, Client } = pkg;

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

// const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json("Phewww, that was a good nap. Server is now awake!");
});

app.get("/goals", async (req, res) => {
  try {
    const goalList = await pool.query(
      "SELECT * FROM goals ORDER BY date_created DESC"
    );
    // setTimeout(() => {
    //   //TODO: testing having delay, remove this on production
    //   res.json(goalList.rows);
    // }, 1000);
    res.json(goalList.rows);
  } catch (error) {
    console.log(error);
  }
});

app.post("/goals", async (req, res) => {
  //!Change preset min to 25
  try {
    const { id, goalName, goalImage } = req.body;
    const newGoal = await pool.query(
      `INSERT INTO goals VALUES (1, $1, $2, $3, '[{"clickable": false, "reveal": false}]', 1, false, false, current_timestamp, null) RETURNING *;`,
      [id, goalName, goalImage]
    );
    // console.log("newGoal", newGoal.rows[0]);
    res.json(newGoal.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

app.delete("/goals", async (req, res) => {
  const { id } = req.body;
  try {
    const goalToDelete = await pool.query(
      "DELETE FROM goals WHERE id = $1 RETURNING *",
      [id]
    );
    // console.log(goalToDelete.rows);
    // setTimeout(() => {
    //   // TODO: remove setTimeout
    //   res.json(goalToDelete.rows[0]);
    // }, 1000);
    res.json(goalToDelete.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

app.patch("/goals", async (req, res) => {
  const { id, is_random, preset_min, blockers } = req.body.currentGoal;
  console.log("PATCH", req.body.currentGoal);
  try {
    const goalToUpdate = await pool.query(
      "UPDATE goals SET is_random = $1, preset_min = $2, blockers = $3 WHERE id = $4 RETURNING *",
      [is_random, preset_min, JSON.stringify(blockers), id]
    );
    console.log(goalToUpdate.rows);
    // setTimeout(() => {
    //   // TODO: remove setTimeout
    //   res.json(goalToDelete.rows[0]);
    // }, 1000);
    res.json(goalToUpdate.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

app.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const currentGoal = await pool.query("SELECT * FROM goals WHERE id = $1", [
      id,
    ]);

    setTimeout(() => {
      res.json(currentGoal.rows[0]);
    }, 500);

    // res.json(currentGoal.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

const PORT = process.env.PORT;

app.listen(PORT || 3000, () => console.log(`App listening to port ${PORT}`));
