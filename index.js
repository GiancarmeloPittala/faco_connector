require("dotenv").config();
const fs = require('fs');

const { products_update, sync } = require('./utils/mysql')
const express = require('express')
const app = express();

app.get('/run', async (req,res) => {
  main()
  res.status(201).json({msg: 'Aggiornamento avviato'})

})

app.listen(process.env.PORT || 80)


async function main(){
  
  let rawdata = fs.readFileSync('database.json');
  let db = JSON.parse(rawdata);

  if( db.isInSync === true ) return
  db.isInSync = true;
  fs.writeFileSync('database.json', JSON.stringify(db));

  await sync()
  await products_update()

  db.isInSync = false;

  let data = JSON.stringify(db);
  fs.writeFileSync('database.json', data);
}







main().then( () => {
  console.log( "Fine" )
}).catch( e => console.error(e) ).finally(() => {
  console.log( "finally")
})