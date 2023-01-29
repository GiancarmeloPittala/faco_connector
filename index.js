
require("dotenv").config();
const { PORT, NODE_ENV } = process.env;

const fs = require('fs');
const path = require('path')
const morgan = require('morgan')

const { products_update, sync } = require('./utils/mysql')
const express = require('express')
const app = express();
const cors = require('cors');


app.use(cors())

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
app.use(morgan('combined', { stream: accessLogStream }))

app.get('/run', async (req, res) => {
  main()
  res.status(201).json({ msg: 'Aggiornamento avviato' })
})

app.listen(PORT)


async function main() {

  let rawdata = fs.readFileSync('database.json');
  let db = JSON.parse(rawdata);

  if (db.isInSync === true) return
  db.isInSync = true;

  fs.writeFileSync('database.json', JSON.stringify(db));

  await sync()
  await products_update()

  db.isInSync = false;

  let data = JSON.stringify(db);
  fs.writeFileSync('database.json', data);
}