# Student Folio Management System

A simple classroom project based on Unit 4 – Node.js.

## Technologies
- Front end: HTML, CSS and browser JavaScript
- Back end: Node.js built-in `http` module
- Database: MongoDB using the official `mongodb` package
- Database viewer: MongoDB Compass

## Folder structure
```
Student_Folio_Project/
  server.js
  package.json             (created by npm init -y)
  package-lock.json        (created by npm install mongodb)
  node_modules/            (created by npm install mongodb)
  public/
    index.html
    register.html
    login.html
    dashboard.html
    style.css
    script.js
```

## Run on Windows
1. Install Node.js LTS and MongoDB Community Server.
2. Start the MongoDB service. Open MongoDB Compass and connect to:
   `mongodb://127.0.0.1:27017`
3. Open this `Student_Folio_Project` folder in VS Code.
4. Open Terminal in VS Code. Make sure the terminal path ends in `Student_Folio_Project`.
5. Run these commands once:
   ```
   npm init -y
   npm install mongodb
   ```
6. Start the project:
   ```
   node server.js
   ```
7. Keep the terminal open and visit:
   `http://localhost:3000`

## Test the project
1. Register a new account.
2. Log in using the same email and password.
3. Add portfolio details.
4. Check that the record appears in the dashboard.
5. Open MongoDB Compass, refresh, and view:
   `studentFolioDB` → `students`
6. Use Edit and Delete to demonstrate Update and Delete.
7. Click Logout.

## MongoDB collections
- `studentFolioDB.users` stores registered accounts.
- `studentFolioDB.students` stores portfolio records.

## Notes
- MongoDB creates the database and collections when the first records are inserted.
- Login sessions are kept in server memory for this small classroom demonstration. Restarting the server logs users out.
- Passwords are hashed using Node.js crypto before storage. This is a classroom learning project, not a production authentication system.
