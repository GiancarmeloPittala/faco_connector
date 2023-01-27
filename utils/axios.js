const Axios = require('axios');

const {
  CHIAVE_UTENTE: chiave_utente,
  UTENTE_NASCOSTO: utente_nascosto,
  BASEURL: baseURL
} = process.env;

const axios = Axios.create({
  baseURL,
  timeout: 1000 * 60 * 10,
  auth: {
    username: chiave_utente,
    password: utente_nascosto
  },
  // maxBodyLength: 200000,
  headers: {
    'content-type': 'application/json; charset=UTF-8',
    'Accept-Encoding': 'application/json'
  },
});


module.exports.createProducts = async function (faco_products) {

  const create = faco_products.map(fp => ({
    name: fp.desc1,
    status: "draft",
    description: fp.tippre,
    sku: fp.codart,
    regular_price: fp.pre1,
    stock_quantity: fp.qta,
    manage_stock: true,
    tags: fp.ingr?.split(",").filter(i => i != '').map(ingr => ({ name: ingr }))
  }))

  const res = await axios.post(`/v3/products/batch`, { create });
  return res.data.create
}


module.exports.put_products = async function (update_products) {

  const update = update_products.map(np => ({
    sku: np.codart,
    regular_price: np.pre1,
    stock_quantity: np.qta,
  }))

  try {
    const res = await axios.post(`/v3/products/batch`, { update });
    return res.data?.update || [];
  } catch (e) {
    throw e
  }

}

module.exports.put_products_qta = async function (product) {
  const { qtan, wc_id } = product

  await axios.put(`/v3/products/${wc_id}`, { stock_quantity: qtan } );

  return;
}
module.exports.put_products_price = async function (product) {
  const { pre1, wc_id } = product

  await axios.put(`/v3/products/${wc_id}`, { regular_price: String(pre1) } );

  return;
}

module.exports.get_products = async function (page = 1, per_page = 100) {

  try {
    const query = new URLSearchParams({ page, per_page })
    const res = await axios.get(`/v3/products?${query}`);
    const total = res.headers['x-wp-total'];
    const pages = res.headers['x-wp-totalpages'];


    const products = res.data.map(d => ({ id: d.id, sku: d.sku, price: d.price || 0, stock_quantity: d.stock_quantity || 0 }))

    return {
      data: products,
      total,
      pages
    }
  } catch (e) {
    throw e
  }

}


