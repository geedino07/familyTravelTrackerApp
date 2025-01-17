import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Password1",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

// let users = [
//   { id: 1, name: "Angela", color: "teal" },
//   { id: 2, name: "Jack", color: "powderblue" },
// ];

let user = [];

async function users(){
  const result = await db.query("select * from users");
  let users = [];
  result.rows.forEach((user) => {
    users.push({ id: user.id, name: user.name, color: user.color });
  });
  // console.log(users);
  return users;
}

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id where user_id = $1; ",
  [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
} 

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  user = await users();
  const selectedColor = user.find(user => user.id == currentUserId)
  const color  = selectedColor.color;
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: user,
    color: color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  console.log(req.body);

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];

    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      console.log(countryCode, currentUserId)
      res.redirect("/");
    } catch (err) {
      console.log(err);
      const countries = await checkVisisted();
      user = await users();
      const selectedColor = user.find(user => user.id == currentUserId)
      const color  = selectedColor.color;
      res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: user,
      color: color,
      error: "Country has already been added. Try again",
    });
    }
  } catch (err) {
    // console.log(err);
    const countries = await checkVisisted();
    const selectedColor = user.find(user => user.id == currentUserId)
    const color  = selectedColor.color;
    user = await users();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: user, 
      color: color,
      error: "Country does not exist.. Enter new country",
    });
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add === "new"){
    res.render("new.ejs");
    return;
  } else{
    currentUserId = req.body.user;
    res.redirect("/");
    return;
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  const result = await db.query("insert into users (name, color) values ($1, $2) RETURNING *; ",
    [name, color])

    const id = result.rows[0].id;
    currentUserId = id;
  res.redirect("/");
  });



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
