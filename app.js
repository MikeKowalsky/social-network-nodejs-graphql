const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const graphqlHttp = require("express-graphql");

const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");

const keys = require("./utils/keys");

const MONGODB_URI = `mongodb+srv://${keys.MONGO_USER}:${
  keys.MONGO_PASSWORD
}@cluster0-idsge.mongodb.net/social-node-graphQL?retryWrites=true`;

const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().toISOString()} - ${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.json()); // application/json
app.use(multer({ storage, fileFilter }).single("image"));

app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(
  "/graphql",
  graphqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true
  })
);

// general error handling middleware
app.use((err, req, res, next) => {
  console.log(err);
  const { statusCode, message, data } = err;
  const status = statusCode || 500;
  res.status(status).json({ message, data });
});

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true })
  .then(c => {
    console.log("***** MongoDB connected *****");
    app.listen(8080, () => console.log("* Server is working on 8080 *"));
  })
  .catch(err => {
    console.log(err);
    throw err;
  });
