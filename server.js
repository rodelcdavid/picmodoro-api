// import express from "express";
// import cors from "cors";
// import pkg from "pg";
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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

//Authentication

//generate accessToken
const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id }, "mySecretKey", { expiresIn: "10s" });
};

//generate refreshToken
const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, "myRefreshSecretKey");
};

//generate tokens in register and login

//verify
const verify = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, "mySecretKey", (err, user) => {
      if (err) {
        return res.status(401).json("Token is not valid! (verify)");
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json("You are not authenticated!");
  }
};
//refresh

//this should be in database to persist even after server restart
let refreshTokensArray = [];

app.post("/refresh", (req, res) => {
  const refreshToken = req.body.token;

  if (!refreshToken) {
    return res.status(401).json("You are not authenticated!");
  }
  if (!refreshTokensArray.includes(refreshToken)) {
    return res.status(401).json("Token is not valid! (refresh)");
  }

  jwt.verify(refreshToken, "myRefreshSecretKey", (err, user) => {
    if (err) {
      console.log(err);
    }

    refreshTokensArray = refreshTokensArray.filter(
      (token) => token !== refreshToken
    );

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    refreshTokensArray.push(newRefreshToken);

    res
      .status(200)
      .json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  });
});

//logout
app.post("/logout", (req, res) => {
  const refreshToken = req.body.token;

  refreshTokensArray = refreshTokensArray.filter(
    (token) => token !== refreshToken
  );

  res.status(200).json("You logged out");
});

app.get("/", (req, res) => {
  res.json("Phewww, that was a good nap. Server is now awake!");
});

//Check email
// /users/:email
app.get("/check/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const emailExists = await pool.query(
      `SELECT * FROM login WHERE email = $1;`,
      [email]
    );

    if (emailExists.rows.length) {
      res.status(400).json("Email already exists");
    } else {
      res.status(200).json("Email available");
    }
  } catch (error) {
    console.log(error);
  }
});

//Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    //Check if email exists
    // const emailExists = await pool.query(
    //   `SELECT * FROM login WHERE email = $1;`,
    //   [email]
    // );

    // if (emailExists.rows.length) {
    //   throw "Email already exists";
    // }

    //hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    //add to user table
    const newUser = await pool.query(
      `INSERT INTO users VALUES (DEFAULT, $1, $2, $3, current_timestamp) RETURNING *;`,
      [name, email, hashedPassword]
    );

    const newLogin = await pool.query(
      `INSERT INTO login VALUES (DEFAULT, $1, $2) RETURNING *;`,
      [newUser.rows[0].email, newUser.rows[0].password]
    );

    const accessToken = generateAccessToken(newUser.rows[0]);
    const refreshToken = generateRefreshToken(newUser.rows[0]);

    refreshTokensArray.push(refreshToken);

    //add tokens to response
    res.status(200).json({ user: newUser.rows[0], accessToken, refreshToken });
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
    //find email in database
    const userExists = await pool.query(
      `SELECT * FROM login WHERE email = $1;`,
      [email]
    );

    if (userExists.rows.length) {
      //Get hash password
      const hashedPassword = userExists.rows[0].password;

      //compare password
      //then add tokens here
      if (await bcrypt.compare(password, hashedPassword)) {
        const userDetails = await pool.query(
          `SELECT * FROM login JOIN users ON login.email = users.email AND login.email = $1;`,
          [email]
        );

        const accessToken = generateAccessToken(userDetails.rows[0]);
        const refreshToken = generateRefreshToken(userDetails.rows[0]);

        refreshTokensArray.push(refreshToken);

        res
          .status(200)
          .json({ user: userDetails.rows[0], accessToken, refreshToken });
      } else {
        res.status(400).json("Wrong credentials.");
      }
    } else {
      //user doesn't exist
      res.status(400).json("Wrong credentials.");
    }
  } catch (e) {
    res.status(400).json(e);
  }
});

//Get all goals of user
app.get("/:userid/goal-list", verify, async (req, res) => {
  const { userid } = req.params;

  try {
    if (req.user.id === Number(userid)) {
      const goalList = await pool.query(
        "SELECT * FROM goals WHERE owner_id = $1 ORDER BY date_created DESC",
        [userid]
      );
      // setTimeout(() => {
      //   //TODO: testing having delay, remove this on production
      //   res.json(goalList.rows);
      // }, 1000);
      res.status(200).json(goalList.rows);
    } else {
      //This will run if other user is trying to access other user's goallist
      res.status(401).json("Invalid user");
    }
  } catch (err) {
    console.log(err);
  }
});

//Add new Goal
app.post("/:userid/:goalid", verify, async (req, res) => {
  //!Change preset min to 25
  const { userid, goalid } = req.params;
  const { goalName, goalImage } = req.body;

  try {
    if (req.user.id === Number(userid)) {
      const newGoal = await pool.query(
        `INSERT INTO goals VALUES ($1, $2, $3, $4, '[{"clickable": false, "reveal": false}]', 1, false, false, current_timestamp, null) RETURNING *;`,
        [userid, goalid, goalName, goalImage]
      );

      res.json(newGoal.rows[0]);
    } else {
      res.status(401).json("Invalid user");
    }
  } catch (error) {
    console.log(error);
  }
});

//Delete Goal

// app.delete("/goals", async (req, res) => {
//   const { id } = req.body;

//   try {
//     //if ownerid from param = id from verified token, add new goal with id from body

//     const goalToDelete = await pool.query(
//       "DELETE FROM goals WHERE id = $1 RETURNING *",
//       [id]
//     );

//     res.json(goalToDelete.rows[0]);
//   } catch (error) {
//     console.log(error);
//   }
// });

app.delete("/:userid/:goalid", verify, async (req, res) => {
  const { userid, goalid } = req.params;
  try {
    if (req.user.id === Number(userid)) {
      const goalToDelete = await pool.query(
        "DELETE FROM goals WHERE id = $1 RETURNING *",
        [goalid]
      );

      res.json(goalToDelete.rows[0]);
    } else {
      res.status(401).json("Invalid user");
    }
  } catch (error) {
    console.log(error);
  }
});

//Update goal
app.patch("/:userid/:goalid", verify, async (req, res) => {
  const { userid, goalid } = req.params;
  const { is_random, preset_min, blockers } = req.body.currentGoal;

  try {
    if (req.user.id === Number(userid)) {
      const goalToUpdate = await pool.query(
        "UPDATE goals SET is_random = $1, preset_min = $2, blockers = $3 WHERE id = $4 RETURNING *",
        [is_random, preset_min, JSON.stringify(blockers), goalid]
      );

      // setTimeout(() => {
      //   // TODO: remove setTimeout
      //   res.json(goalToDelete.rows[0]);
      // }, 1000);
      res.status(200).json(goalToUpdate.rows[0]);
    } else {
      res.status(401).json("Invalid user");
    }
  } catch (error) {
    console.log(error);
  }
});

//GET current Goal
//endpoint should be /:ownerid/:goalid
app.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    //if ownerid = id from verified token, get goal with goalid

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
