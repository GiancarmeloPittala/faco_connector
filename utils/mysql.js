const mysql = require('mysql2');

const { put_products_qta, put_products_price, createProducts, get_products } = require('../utils/axios');

const { getAllProducts } = require('../utils/sgrricambi');


const {
  DB_PASSWORD: password,
  DB_HOST: host,
  DB_DATABASE: database,
  DB_USER: user
} = process.env

const pool = mysql.createPool({ host, user, database, password });
const conn = pool.promise();

let anno = String(new Date().getFullYear()).substring(2, 4);
module.exports.woocommerce_to_faco_products = async (products) => {
  const valori = products.map(p => `(${p.id},"${p.sku}",${p.stock_quantity},${p.price})`)

  const sql = `insert into sgrricambi_products( wc_id, codart, qta, price ) values ${valori}`

  await conn.query(sql)

}


module.exports.faco_products = async function (offset = 0, limit = 100) {

  let query = `select distinct codart, coddep from 01_movmag${anno} m limit ${offset * limit}, ${limit}`;

  const [rows_codarts] = await conn.query(query);

  // prendo i codici articolo in un unico array
  const codarts = rows_codarts.map(r => r.codart);

  // prendo i dati dei articoli
  query = `explain select a.codart,a.desc1,a.unimis,a.pre1,a.id,a.ingr,a.tippre,ae.ean, 
    SUM(m.QTA*CONVERT(CONCAT(SubStr(c.TEST,4,1),'1'),SIGNED)) as qtat
    from 01_movmag${anno} m 
    left join 01_anaart a on a.codart = m.codart
    left join 01_anaarte ae on a.id = ae.idanaart
    left join 01_caumag c on c.cod= m.codcau
    where
      m.codart in (?${",?".repeat(codarts.length - 1)}) and
      subStr(c.test, 4, 1) != ''
      group by a.codart order by a.codart
    `

  const [rows_products] = await conn.query(query, codarts);

  // pulisco ing e tippre
  for (const product of rows_products) {
    product.ingr = String(product.ingr).replace(/[^0-9a-z,]/gi, ',').replace(/,,+/g, ',').replace('null', '')
    product.tippre = String(product.tippre).replace(/[^0-9a-z ]/gi, '').replace(/  +/g, ' ').replace('null', '')
  }

  console.log("total product find", rows_codarts.length)
  return rows_products;

}

async function update_product_qta() {
  let sql_qta = `
  select SUM(m.QTA*CONVERT(CONCAT(SubStr(c.TEST,4,1),'1'),SIGNED)) as qtan, sp.*
	from 01_movmag${anno} m 
	left join 01_anaart a on a.codart = m.codart
    left join 01_anaarte ae on a.id = ae.idanaart
    left join 01_caumag c on c.cod= m.codcau
    left join sgrricambi_products sp on m.codart = sp.codart
    where
      subStr(c.test, 4, 1) != ''
      group by a.codart having qtan != qta order by a.codart;`

  let [rows_products_qta] = await conn.query(sql_qta);

  // aggiorno la qta
  console.log("Aggiornamento prodotti|QTA in corso ", rows_products_qta.length)
  for (const product of rows_products_qta) {

    if (product.wc_id != null) {
      console.log(`Aggiornamento su woocommerce di ${product.codart}`)
      await put_products_qta(product)

      console.log(`Aggiornamento quantità in faco ${product.qta} to ${product.qtan}`)
      await conn.query(`update sgrricambi_products set qta = ${product.qtan} where wc_id = ${product.wc_id}`)

    } else {
      console.log(`il prodotto ${product.codart} non ha id wc registrato`)
    }

  }
}

async function update_product_price() {
  // aggiorno il price 
  const sql_price = `select sp.*, a.pre1 from 01_anaart a right join sgrricambi_products sp on a.codart = sp.codart where a.pre1 != sp.price;`

  let [rows_products_price] = await conn.query(sql_price);
  console.log("Aggiornamento prodotti|PRICE in corso ", rows_products_price.length)

  for (const product of rows_products_price) {

    if (product.wc_id != null) {
      console.log(`Aggiornamento su woocommerce di ${product.codart}`)
      await put_products_price(product)

      console.log(`Aggiornamento prezzo in faco ${product.pre1} to ${product.price}`)
      await conn.query(`update sgrricambi_products set price = ${product.pre1} where wc_id = ${product.wc_id}`)

    } else {
      console.log(`il prodotto ${product.codart} non ha id wc registrato`)
    }

  }

  // libero la memoria
  rows_products_price = [];
}

async function create_product() {
  const sql_new_products = ` select a.pre1, a.desc1, a.tippre, a.ingr, SUM(m.QTA*CONVERT(CONCAT(SubStr(c.TEST,4,1),'1'),SIGNED)) as qta, m.codart 
  from 01_movmag${anno} m
  left join sgrricambi_products sp on m.codart = sp.codart
  left join 01_caumag c on c.cod= m.codcau
  left join 01_anaart a on a.codart = m.codart
  where sp.codart is null group by m.codart;`

  const [rows_new_products] = await conn.query(sql_new_products);

  console.log("Aggiornamento prodotti|NEW in corso ", rows_new_products.length)

  const tot = rows_new_products.length;
  const limit = 100;
  for (let i = 0; i < Math.ceil(tot / limit); i++) {
    const new_products = rows_new_products.slice(i * limit, i * limit + limit);
    console.log(`Post wc ${new_products.length} products ${i}/${Math.ceil(tot / limit)}`)
    const sgrricambi_product = await createProducts(new_products)
    // salvo su sgrricambi_products
    for (const p of sgrricambi_product) {
      const { sku, regular_price, stock_quantity, id } = p
      console.log(`Creazione ${sku} in faco`)
      await conn.execute(`insert into sgrricambi_products(codart,qta,price,wc_id) values(?,?,?,?)`, [sku, stock_quantity, regular_price, id]);
    }
  }
}

module.exports.products_update = async function () {
  await update_product_qta();
  await update_product_price();
  await create_product();



}

module

module.exports.sync = async function () {
  console.log( "Sync in corso")
  // prodotti in woocommerce
  const all_products = await getAllProducts();

  console.log( `trovati ${all_products.length} prodotti`);
  let i = 1;
  const [rows] = await conn.query(`Select wc_id from sgrricambi_products`);
  const ids = rows.map( r => r.wc_id )
  const new_products = all_products.filter( p => ids.indexOf(p.post_id) === -1 )


  for ( const product of new_products){
    const { value: sku, post_id: id} = product; 
    console.log(`Creazione ${sku}`)
    await conn.execute(`insert into sgrricambi_products(codart,wc_id) values(?,?)`,[sku, id]);
    console.log( `stato ${i++}/${new_products.length}`)
    
  }
  console.log( "Fine sync")


}

module.exports._sync = async function () {

  let current_page = 1;
  let max_page = 1;
  do {
    const { data, pages } = await get_products(current_page)
    max_page = pages;

    for (const p of data) {
      const { sku, price, stock_quantity, id } = p;
      const [rows] = await conn.query(`Select *  from sgrricambi_products where wc_id = ?`, [id]);
      if (rows.length === 0) {
        console.log(`Creazione ${sku}`)
        await conn.execute(`insert into sgrricambi_products(codart,qta,price,wc_id) values(?,?,?,?)`,
          [sku, stock_quantity, price, id]);
      }


    }


    console.log(`avanzamento ${current_page}/${max_page}`)
  } while (current_page++ <= max_page);

}