const mysql = require('mysql2');

const { DB_SGR_HOST, DB_SGR_DATABASE, DB_SGR_USER, DB_SGR_PASSWORD } = process.env;

const pool = mysql.createPool({
  host: DB_SGR_HOST,
  password: DB_SGR_PASSWORD,
  user: DB_SGR_USER,
  database: DB_SGR_DATABASE
});

const conn = pool.promise();

module.exports.getAllInfoProducts = async function () {
  
  try {
    
    const [rows,fields] = await conn.query(`
    SELECT
    wpp.id,
    wppm.meta_key AS FIELD,
    wppm.meta_value AS value,
    wppm.*
  FROM sgr_posts AS wpp
    LEFT JOIN sgr_postmeta AS wppm
      ON wpp.ID = wppm.post_id
  WHERE wpp.post_type = 'product'
        AND wppm.meta_key = '_sku'
  ORDER BY wpp.ID ASC, FIELD ASC, wppm.meta_id DESC;`)

    return rows;

  } catch (error) {
    console.log(error)
  }
}

module.exports.getAllProducts = async function () {
  
  try {
    
    const [rows,fields] = await conn.query(`
    SELECT
    wpp.id,
    wppm.meta_key AS FIELD,
    wppm.meta_value AS value,
    wppm.*
  FROM sgr_posts AS wpp
    LEFT JOIN sgr_postmeta AS wppm
      ON wpp.ID = wppm.post_id
  WHERE wpp.post_type = 'product'
        AND wppm.meta_key = '_sku'
  ORDER BY wpp.ID ASC, FIELD ASC, wppm.meta_id DESC;`)

    return rows;

  } catch (error) {
    console.log(error)
  }
}

module.exports.update_regular_price = async function (price, post_id) {
  
  try {
    
    await conn.query(`UPDATE sgr_postmeta SET meta_value = ${price} WHERE meta_key = "_regular_price" AND post_id = ${post_id}`)
    await conn.query(`UPDATE sgr_postmeta SET meta_value = ${price} WHERE meta_key = "_price" AND post_id = ${post_id}`)

  } catch (error) {
    console.log(error)
  }
}