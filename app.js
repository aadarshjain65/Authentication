const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())

const databasePath = path.join(__dirname, 'userData.db')

let database = null

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

// User Register API

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hasedPassword = await bcrypt.hash(password, 10)
  const selcetUserQuery = `
        SELECT * FROM user WHERE username = '${username}';
    `
  const databaseUser = await database.get(selcetUserQuery)

  if (databaseUser === undefined) {
    const createUserQuery = `
              INSERT INTO 
                  user (username, name, password, gender, location)
              VALUES ("${username}", "${name}", "${hasedPassword}", "${gender}", "${location}")
          `
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const databaseResponse = await database.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

// User Login API

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
    SELECT * 
    FROM user
    WHERE username = '${username}';
  `

  const databaseUser = await database.get(selectUserQuery)

  if (databaseUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password,
    )
    if (isPasswordMatched === true) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// Update User Password API

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const checkForUserQuery = `
    SELECT * FROM user WHERE username = "${username}";
  `

  const databaseUser = await database.get(checkForUserQuery)
  if (databaseUser === undefined) {
    response.status(400)
    response.send('User not registered')
  } else {
    const isValidPassword = await bcrypt.compare(
      oldPassword,
      databaseUser.password,
    )
    if (isValidPassword === true) {
      const lengthOfNewPassword = newPassword.length
      if (lengthOfNewPassword < 5) {
        response.status(400)
        response.send('Password is too short')
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        const updatePasswordQuery = `
          UPDATE user
          SET password="${encryptedPassword}"
          WHERE username = "${username}";
        `
        await database.run(updatePasswordQuery)
        response.send('Password updated')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})

module.exports = app
