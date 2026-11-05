const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");

const PORT = 3000;
const MONGO_URL = "mongodb://127.0.0.1:27017";
const client = new MongoClient(MONGO_URL);
const sessions = new Map();

let users;
let students;

function sendJSON(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function readJSON(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
      if (body.length > 1_000_000) reject(new Error("Request too large"));
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function getUserId(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/folioSession=([^;]+)/);
  return match ? sessions.get(match[1]) : null;
}

function safeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email
  };
}

function sendFile(res, fileName) {
  const filePath = path.join(__dirname, "public", fileName);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8"
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Page not found");
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(fileName)] || "application/octet-stream"
    });
    res.end(data);
  });
}

function makePassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Registration
  if (req.method === "POST" && pathname === "/api/register") {
    const data = await readJSON(req);
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");

    if (!name || !email || password.length < 4) {
      return sendJSON(res, 400, { message: "Enter all details. Password must have at least 4 characters." });
    }

    if (await users.findOne({ email })) {
      return sendJSON(res, 409, { message: "This email is already registered." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = makePassword(password, salt);
    await users.insertOne({ name, email, salt, passwordHash, createdAt: new Date() });
    return sendJSON(res, 201, { message: "Registration successful. Please log in." });
  }

  // Login
  if (req.method === "POST" && pathname === "/api/login") {
    const data = await readJSON(req);
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const user = await users.findOne({ email });

    if (!user || makePassword(password, user.salt) !== user.passwordHash) {
      return sendJSON(res, 401, { message: "Invalid email or password." });
    }

    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, user._id.toString());
    return sendJSON(res, 200, { message: "Login successful." }, {
      "Set-Cookie": `folioSession=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
    });
  }

  // Logout
  if (req.method === "POST" && pathname === "/api/logout") {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/folioSession=([^;]+)/);
    if (match) sessions.delete(match[1]);
    return sendJSON(res, 200, { message: "Logged out." }, {
      "Set-Cookie": "folioSession=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
    });
  }

  // All remaining API routes require login
  if (pathname.startsWith("/api/")) {
    const userId = getUserId(req);
    if (!userId) return sendJSON(res, 401, { message: "Please log in first." });

    if (req.method === "GET" && pathname === "/api/me") {
      const user = await users.findOne({ _id: new ObjectId(userId) });
      if (!user) return sendJSON(res, 401, { message: "User not found." });
      return sendJSON(res, 200, { user: safeUser(user) });
    }

    if (req.method === "GET" && pathname === "/api/students") {
      const list = await students.find({ ownerId: userId }).sort({ _id: -1 }).toArray();
      return sendJSON(res, 200, list.map(item => ({
        id: item._id.toString(),
        name: item.name,
        course: item.course,
        email: item.email,
        skills: item.skills,
        about: item.about
      })));
    }

    if (req.method === "POST" && pathname === "/api/students") {
      const data = await readJSON(req);
      const student = {
        ownerId: userId,
        name: String(data.name || "").trim(),
        course: String(data.course || "").trim(),
        email: String(data.email || "").trim(),
        skills: String(data.skills || "").trim(),
        about: String(data.about || "").trim(),
        createdAt: new Date()
      };
      if (!student.name || !student.course || !student.email) {
        return sendJSON(res, 400, { message: "Name, course and email are required." });
      }
      const result = await students.insertOne(student);
      return sendJSON(res, 201, { message: "Student details added.", id: result.insertedId.toString() });
    }

    const match = pathname.match(/^\/api\/students\/([a-f0-9]{24})$/i);
    if (match && req.method === "PUT") {
      const data = await readJSON(req);
      const result = await students.updateOne(
        { _id: new ObjectId(match[1]), ownerId: userId },
        { $set: {
          name: String(data.name || "").trim(),
          course: String(data.course || "").trim(),
          email: String(data.email || "").trim(),
          skills: String(data.skills || "").trim(),
          about: String(data.about || "").trim()
        }}
      );
      if (!result.matchedCount) return sendJSON(res, 404, { message: "Student record not found." });
      return sendJSON(res, 200, { message: "Student details updated." });
    }

    if (match && req.method === "DELETE") {
      const result = await students.deleteOne({
        _id: new ObjectId(match[1]),
        ownerId: userId
      });
      if (!result.deletedCount) return sendJSON(res, 404, { message: "Student record not found." });
      return sendJSON(res, 200, { message: "Student details deleted." });
    }

    return sendJSON(res, 404, { message: "API route not found." });
  }

  // Public website pages
  if (req.method === "GET") {
    if (pathname === "/") return sendFile(res, "index.html");
    if (pathname === "/register.html") return sendFile(res, "register.html");
    if (pathname === "/login.html") return sendFile(res, "login.html");
    if (pathname === "/dashboard.html") return sendFile(res, "dashboard.html");
    if (pathname === "/style.css") return sendFile(res, "style.css");
    if (pathname === "/script.js") return sendFile(res, "script.js");
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Page not found");
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    console.error(error);
    if (!res.headersSent) sendJSON(res, 500, { message: "Server error. Check the terminal." });
    else res.end();
  });
});

async function start() {
  await client.connect();
  const db = client.db("studentFolioDB");
  users = db.collection("users");
  students = db.collection("students");
  await users.createIndex({ email: 1 }, { unique: true });
  server.listen(PORT, () => {
    console.log(`MongoDB connected. Student Folio running at http://localhost:${PORT}`);
  });
}

start().catch(error => {
  console.error("Could not start. Make sure MongoDB is running.", error);
  process.exit(1);
});
