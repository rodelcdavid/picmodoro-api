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
  //   connectionString: "https://localhost:5432",
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
// const database = {
//   users: [
//     {
//       id: "1",
//       name: "Rodel",
//       email: "rodelcdavid@gmail.com",
//       password: "1234",
//       entries: 0,
//     },
//     {
//       id: "2",
//       name: "abc",
//       email: "abc@gmail.com",
//       password: "1234",
//       entries: 0,
//     },
//   ],
// };

app.get("/", (req, res) => {
  res.json("Phewww, that was a good nap. Server is now awake!");
});

app.get("/goals", async (req, res) => {
  try {
    const goalList = await pool.query("SELECT * FROM goals");
    setTimeout(() => {
      //TODO: testing having delay, remove this on production
      res.json(goalList.rows);
    }, 1000);
  } catch (error) {
    console.log(error);
  }
});

app.post("/goals", async (req, res) => {
  try {
    const { id, goalName, goalImage } = req.body;
    const newGoal = await pool.query(
      `INSERT INTO goals VALUES (1, $1, $2, $3, '[{"clickable": false, "reveal": false}]', 25, false, false, current_timestamp, null) RETURNING *;`,
      [id, goalName, goalImage]
    );
    console.log("newGoal", newGoal.rows[0]);
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
    console.log(goalToDelete.rows);
    res.json(goalToDelete.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

// // app.post("/profile", (req, res) => {
// //   console.log(req.body);
// //   res.send(req.body);
// // });

// app.post("/signin", async (req, res) => {
//   // try {
//   //   const { email, password } = req.body;

//   //   const foundUser = await pool.query(
//   //     "SELECT * FROM users WHERE email = $1 AND password = ",
//   //     [name, email, new Date()]
//   //   );
//   // } catch (error) {}

//   let found = false;
//   database.users.map((user) => {
//     if (user.email === email && user.password === password) {
//       res.json(user);
//       found = true;
//     }
//   });
//   if (!found) {
//     res.status(400).json("error logging in");
//   }
// });

// app.post("/register", async (req, res) => {
//   try {
//     const { name, email } = req.body;
//     const newUser = await pool.query(
//       "INSERT INTO users (name, email, joined) VALUES($1, $2, $3) RETURNING *",
//       [name, email, new Date()]
//     );
//     //create new entry in the login table, use transactions
//     //is a login table necessary?
//     res.json(newUser.rows[0]);
//   } catch (error) {
//     console.log(error);
//   }
// });

// app.put("/detect", async (req, res) => {
//   try {
//     const { id } = req.body;
//     let { entries } = req.body;
//     // const prevEntry = await pool.query(
//     //   "SELECT entries FROM users WHERE id = $1",
//     //   [id]
//     // );

//     // const plusEntry = Number(prevEntry.rows[0].entries) + 1;
//     // console.log(Number(prevEntry.rows[0].entries) + 1);
//     // console.log(Number(entries) + 1);
//     const newEntry = await pool.query(
//       "UPDATE users SET entries = $1 WHERE id = $2 RETURNING *",
//       [Number(entries) + 1, id]
//     );

//     // console.log(prevEntry.rows[0]);
//     res.json(newEntry.rows[0].entries);
//   } catch (error) {
//     console.log(error);
//   }
//   // let found = false;
//   // database.users.map((user) => {
//   //   if (user.id === req.body.id) {
//   //     found = true;
//   //     user.entries++;
//   //     res.json(user.entries);
//   //   }
//   // });
//   // if (!found) {
//   //   res.status(400).json("not found");
//   // }
// });

// app.get("/profile/:id", (req, res) => {
//   const { id } = req.params;

//   database.users.forEach((user) => {
//     if (user.id === Number(id)) {
//       return res.json(user);
//     } else {
//       return res.status(404).json("no such user");
//     }
//   });
// });

const PORT = process.env.PORT;

app.listen(PORT || 3000, () => console.log(`App listening to port ${PORT}`));
