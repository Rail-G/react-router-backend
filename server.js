import passport from "passport";
import { Strategy } from "passport-http-bearer";
import bcrypt from "bcrypt";
import faker from "faker";
import express from "express";
import * as uuid from "uuid";
import cors from "cors";
import bodyParser from "body-parser";
import path, { dirname, resolve } from 'path';
import fs from "fs"
import { fileURLToPath } from 'url';

const app = express();

app.use(cors());
app.use(
  bodyParser.json({
    type(req) {
      return true;
    },
  })
);
app.use(function (req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  next();
});

const tokens = new Map();
const users = new Map();
const rounds = 10;

users.set("vasya", {
  id: uuid.v4(),
  login: "vasya",
  name: "Vasya",
  password: bcrypt.hashSync("password", rounds),
  avatar: "https://i.pravatar.cc/40",
});

const news = [
  {
    id: uuid.v4(),
    title: faker.lorem.words(),
    image: "https://placeimg.com/640/480/nature",
    content: faker.lorem.paragraph(),
  },
  {
    id: uuid.v4(),
    title: faker.lorem.words(),
    image: "https://placeimg.com/640/480/arch",
    content: faker.lorem.paragraph(),
  },
  {
    id: uuid.v4(),
    title: faker.lorem.words(),
    image: "https://placeimg.com/640/480/tech",
    content: faker.lorem.paragraph(),
  },
  {
    id: uuid.v4(),
    title: faker.lorem.words(),
    image: "https://placeimg.com/640/480/sepia",
    content: faker.lorem.paragraph(),
  },
];

passport.use(
  new Strategy((token, callback) => {
    const user = tokens.get(token);
    if (user === undefined) {
      return callback(null, false);
    }

    return callback(null, user);
  })
);
const bearerAuth = passport.authenticate("bearer", { session: false });

app.post("/auth", async (req, res) => {
  try {
    const { login, password } = req.body;
    const user = users.get(login);
    if (user === undefined) {
      return res
        .status(400)
        .send(JSON.stringify({ message: "user not found" }));
    }

    const result = await bcrypt.compare(password, user.password);
    if (result === false) {
      return res
        .status(400)
        .send(JSON.stringify({ message: "invalid password" }));
    }
    const token = uuid.v4();
    tokens.set(token, user);
    return res.send(JSON.stringify({ token }));
  } catch (error) {
    console.error(error);
    res.status(500).send(JSON.stringify({ message: "Server internal error" }));
  }
});

app.use("/private**", bearerAuth);
app.get("/private/me", async (req, res) => {
  try {
    res.send(
      JSON.stringify({
        id: req.user.id,
        login: req.user.login,
        name: req.user.name,
        avatar: req.user.avatar,
      })
    );
  } catch (error) {
    console.error(error);
    res.status(500).send(JSON.stringify({ message: "Server internal error" }));
  }
});
app.get("/private/news", async (req, res) => {
  try {
    res.send(JSON.stringify(news));
  } catch (error) {
    res.status(500).send(JSON.stringify({ message: "Server internal error" }));
  }
});

let posts = [];
let nextId = 1;

app.get("/posts", (req, res) => {
  res.send(JSON.stringify(posts))
});

app.get("/posts/:id", (req, res) => {
  const postId = Number(req.params.id);
  const index = posts.findIndex((o) => o.id === postId);
  res.send(JSON.stringify({ post: posts[index] }));
});


const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesFolder = resolve(__dirname, 'img');

app.use('/img', express.static(imagesFolder)); 

app.post("/posts", (req, res) => {
  const body = req.body
  const randomFile = Math.ceil(Math.random() * 10);
  posts.push({id: nextId++, created: Date.now(), author: faker.name.findName(), ...body, company: faker.name.jobType(), avatar: `http://localhost:7070/img/${randomFile}.png`});
  res.status(204);
  res.end();
});

app.put("/posts/:id", (req, res) => {
  const postId = Number(req.params.id);
  posts = posts.map((o) => {
    if (o.id === postId) {
      return {
        ...o,
        ...req.body,
        id: o.id,
      };
    }
    return o;
  });
  res.status(204).end();
});

app.delete("/posts/:id", (req, res) => {
  const postId = Number(req.params.id);
  const index = posts.findIndex((o) => o.id === postId);
  if (index !== -1) {
    posts.splice(index, 1);
  }
  res.status(204);
  res.end();
});

const port = process.env.PORT || 7070;
app.listen(port, () => console.log(`The server is running on port ${port}.`));