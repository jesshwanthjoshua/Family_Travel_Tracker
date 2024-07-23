import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Family14!$",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function getCurrentUser(){
  console.log("getCurrentUser - currentUserId: ", currentUserId);

  const result = await db.query("SELECT * FROM users");
  console.log("getCurrentUser - result: ",result.rows);

  users = result.rows;
  console.log("getCurrentUser - users: ", users);

  return users.find((user) => user.id === currentUserId);
}

async function visitedCountries(){

  console.log("visitedCountries - currentUserId: ", currentUserId);

  let visited_countries_code = [];

  const result = await db.query(
    "SELECT users.id, users.name, users.color, visited_countries.country_code, visited_countries.country_name FROM visited_countries JOIN users ON users.id = visited_countries.user_id WHERE user_id = $1",[currentUserId]);
  
    console.log("visitedCountries - result: ", result.rows);
  
  result.rows.forEach((row) => {
    if (visited_countries_code.includes(row.country_code) === false)
          visited_countries_code.push(row.country_code);
  })

  return visited_countries_code;
}

app.get("/", async (req, res) => {
  //Write your code here.

  let currentUser = await getCurrentUser();
  console.log("currentUser: ", currentUser);

  let visited_countries = await visitedCountries();
  console.log("visited_countries: ", visited_countries);

  console.log("currentUser - color: ", currentUser.color);

  res.render("index.ejs", {
    users: users, 
    countries: visited_countries, 
    total: visited_countries.length, 
    color: currentUser.color
  });

});

app.post("/add", async(req, res) => {
  console.log(req.body);
  let country_name = req.body.country;
  console.log("/add - country_name: ", country_name);
  
  try{ 
      const result = await db.query(
        "SELECT country_code,country_name FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",[country_name.toLowerCase()]);
      
      console.log("/add - 1st result: ",result.rows);

      const data = result.rows[0];
      console.log("data: ", data);

      let country_code = data.country_code;
      country_name = data.country_name;
      console.log("/add - 1st result - country code: ", country_code);
      console.log("/add - 1st result - country name: ", country_name);

      try{
        await db.query(
          "INSERT INTO visited_countries(country_code, country_name, user_id) VALUES ($1, $2,$3)",[country_code, country_name,currentUserId]);
        
        res.redirect("/");

      } catch (err){
        console.log(err);

        let currentUser = await getCurrentUser();
        console.log("currentUser: ", currentUser);
      
        let visited_countries = await visitedCountries();
        console.log("visited_countries: ", visited_countries);

        res.render("index.ejs", {
          users: users,
          color: currentUser.color,
          countries: visited_countries,
          total: visited_countries.length,
          error: "Country has already been added for this user, try again.",
        });
      }

  } catch(err){
    console.log(err);
    
    let currentUser = await getCurrentUser();
    console.log("currentUser: ", currentUser);

    let visited_countries = await visitedCountries();
    console.log("visited_countries: ", visited_countries);
     
    res.render("index.ejs", {
      users: users,
      color: currentUser.color,
      countries: visited_countries,
      total: visited_countries.length,
      error: "Country name does not exist, try again."
    });
  }

});

app.post("/user", async (req, res) => {
  console.log("/user - req.body: ",req.body);
  if (req.body.user){
    currentUserId = parseInt(req.body['user']);
    console.log("/user - currentUserId: ", currentUserId);
    res.redirect("/");
  }
  else{
    res.render("new.ejs");
  }
  
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html

  console.log(req.body);
  let user_name = req.body.name;
  let chosen_color = req.body.color;

  const result = await db.query(
    "INSERT INTO users(name, color) VALUES ($1, $2) RETURNING id",[user_name, chosen_color]);
  
  console.log("new user - post result: ", result.rows);
  currentUserId = result.rows[0].id;
  console.log("/new - currentUserId: ", currentUserId);

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
