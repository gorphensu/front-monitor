let knex = require('knex');

(async function () {

  let knexClient = knex({
    client: 'mysql',
    connection: {
      host: '47.112.112.79',
      user: 'root',
      password: '123456',
      database: 'platform'
    }
  });

  let res = await knexClient('t_o_project').select('*')
  console.log(res)
})();