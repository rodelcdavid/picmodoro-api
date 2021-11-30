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

//For heroku
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json("Phewww, that was a good nap. Server is now awake!");
});

//Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    //Check if email exists
    const emailExists = await pool.query(
      `SELECT * FROM login WHERE email = $1;`,
      [email]
    );

    if (emailExists.rows.length) {
      throw "Email already exists";
    }

    //add to user table
    const newUser = await pool.query(
      `INSERT INTO users VALUES (DEFAULT, $1, $2, $3, current_timestamp) RETURNING *;`,
      [name, email, password]
    );

    const newLogin = await pool.query(
      `INSERT INTO login VALUES (DEFAULT, $1, $2) RETURNING *;`,
      [newUser.rows[0].email, newUser.rows[0].password]
    );
    res.status(200).json(newUser.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(400).json(e);
  } finally {
    client.release();
  }
});

//Sign in
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await pool.query(
      `SELECT * FROM login WHERE email = $1 AND password = $2;`,
      [email, password]
    );
    console.log(userExists.rows);
    if (userExists.rows.length) {
      const userDetails = await pool.query(
        `SELECT * FROM login JOIN users ON login.email = users.email AND login.email = $1;`,
        [email]
      );
      res.status(200).json(userDetails.rows[0]);
    } else {
      res.status(400).json("Error signing in");
    }
  } catch (e) {
    res.status(400).json(e);
  }
});

//Get all goals of user
app.get("/user/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const goalList = await pool.query(
      "SELECT * FROM goals WHERE owner_id = $1 ORDER BY date_created DESC",
      [id]
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

//Add new Goal
app.post("/goals", async (req, res) => {
  //!Change preset min to 25
  try {
    const { ownerId, id, goalName, goalImage } = req.body;
    const newGoal = await pool.query(
      `INSERT INTO goals VALUES ($1, $2, $3, $4, '[{"clickable": false, "reveal": false}]', 1, false, false, current_timestamp, null) RETURNING *;`,
      [ownerId, id, goalName, goalImage]
    );
    // console.log("newGoal", newGoal.rows[0]);
    res.json(newGoal.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

//Delete Goal
app.delete("/goals", async (req, res) => {
  const { id } = req.body;
  try {
    const goalToDelete = await pool.query(
      "DELETE FROM goals WHERE id = $1 RETURNING *",
      [id]
    );

    res.json(goalToDelete.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

//Update goal
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

//GET current Goal
app.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const currentGoal = await pool.query("SELECT * FROM goals WHERE id = $1", [
      id,
    ]);

    if (currentGoal.rows.length) {
      setTimeout(() => {
        res.json(currentGoal.rows[0]);
      }, 500);
    } else {
      res.status(404).json("Goal not found");
    }

    // res.json(currentGoal.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

const PORT = process.env.PORT;

app.listen(PORT || 3000, () => console.log(`App listening to port ${PORT}`));
