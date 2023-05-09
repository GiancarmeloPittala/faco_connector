
require("dotenv").config();
const { PORT, NODE_ENV } = process.env;

const fs = require('fs');
const path = require('path')
const morgan = require('morgan')

const { products_update, sync } = require('./utils/mysql')
const express = require('express')
const app = express();
const cors = require('cors');

const util = require('util');
const logFile = fs.createWriteStream('log.txt', { flags: 'a' });
const logStdout = process.stdout;

console.log = function () {
  logFile.write(util.format.apply(null, arguments) + '\n');
  logStdout.write(util.format.apply(null, arguments) + '\n');
}
console.error = console.log;


app.use(cors())

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
app.use(morgan('combined', { stream: accessLogStream }))

app.use('/', express.static(__dirname + '/public'));

app.get('/run', async (req, res) => {
  main()
  res.status(201).json({ msg: 'Aggiornamento avviato' })
})

app.listen(PORT)


async function main() {
  let rawdata = fs.readFileSync('database.json');
  let db = JSON.parse(rawdata);
  try {

    if (db.isInSync === true) return
    db.isInSync = true;
    fs.writeFileSync('database.json', JSON.stringify(db));

    await sync()
    await products_update()

  } catch (error) {
    console.error ( error )
  } finally {
    db.isInSync = false;
    fs.writeFileSync('database.json', JSON.stringify(db));
  }
}

main()
// setInterval(() => {
//   main()
// }, 1000 * 60 * 2)