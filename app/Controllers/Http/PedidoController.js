'use strict'

var moment = require('moment'); // require
const { query } = require('../../Models/Pedido');
const Database = use("Database");

const { validateAll } = use("Validator");
const Pedido = use("App/Models/Pedido");
const User = use("App/Models/User");
const Produtos = use("App/Models/Produtos");
const pedido_produto = use("App/Models/PedidoProduto");


class PedidoController {
  async store({ request, response }) {
    const rules = {

      lat: 'required',
      lng: 'required',
      status: 'required',
      id_consumidor: 'required',
      id_vendedor: 'required',
    }
    const messages = {

      "lat.required": ' latitude deve ser informado',
      "lng.required": 'longitude deve ser informado',
      "status.required": 'status precisa ser definido',
      "id_consumidor.required": ' id do consumidor deve ser informado',
      "id_vendedor.required": " id do vendedor deve ser informado",

    }

    const validate = await validateAll(request.all(), rules, messages);
    if (validate.fails()) {
      return response.status(401).send({ message: validate.messages() })
    }

    const data = request.only(['data_hora_criado', 'data_hora_finalizado', 'lat', 'lng', 'status', 'id_consumidor', 'id_vendedor','distance'])
    data.data_hora_criado = moment().format()
    data.status = 1
    const pedido = await Pedido.create(data);

    const produtoPedido = request.input('produtos');
    produtoPedido.map(element => {
      element.pedido_id = pedido.id
    });
    console.log(produtoPedido)
    const pedido_produtoo = await pedido_produto.createMany(produtoPedido)

    return pedido
  }


  async index({ request }) {
    const json = request.only(["id"])

    const sql = await Pedido.query()
      .select('pedidos.id')
      .select('pedidos.lat')
      .select('pedidos.lng')
      .select('pedidos.status')
      .select('pedidos.distance')
      .select('pedidos.data_hora_criado')
      .select('pedidos.data_hora_finalizado')
      .select('user_vendedor.id as vendedor_id')
      .select('user_vendedor.nome as vendedor_nome')
      .select('user_vendedor.email as vendedor_email')
      .select('user_vendedor.empresa as vendedor_empresa')
      .select('user_vendedor.telefone as vendedor_telefone')
      .select('user_consumidor.id as consumidor_id')
      .select('user_consumidor.nome as consumidor_nome')
      .select('user_consumidor.email as consumidor_email')
      .select('user_consumidor.telefone as consumidor_telefone')
      .from('pedidos')
      .innerJoin({ user_consumidor: 'users' }, (query) => {
        query.on('user_consumidor.id', '=', 'pedidos.id_consumidor')
      })
      .innerJoin({ user_vendedor: 'users' }, (query) => {
        query.on('user_vendedor.id', '=', 'pedidos.id_vendedor')
      })
      .whereRaw('pedidos.id_consumidor = ? OR pedidos.id_vendedor = ?', [json.id, json.id])
      .with('produtos.categoria')
      .fetch();

    if (sql != null) {
      const json = sql.toJSON();

      json.map(e => {
        e.user_vendedor = {
          "id": e.vendedor_id,
          "nome": e.vendedor_nome,
          "email": e.vendedor_email,
          "empresa": e.vendedor_empresa,
          "telefone": e.vendedor_telefone
        },
        delete e.vendedor_id;
        delete e.vendedor_nome;
        delete e.vendedor_email;
        delete e.vendedor_empresa;
        delete e.vendedor_telefone;

        e.user_consumidor = {
          "id": e.consumidor_id,
          "nome": e.consumidor_nome,
          "email": e.consumidor_email,
          "telefone": e.consumidor_telefone

        }
        delete e.consumidor_id;
        delete e.consumidor_nome;
        delete e.consumidor_email;
        delete e.consumidor_telefone;
      });

      return json;

    }

    return null;
  }


  async update({ params, request ,response}) {
    const status = request.only('status')
    console.log(status.status)
    const pedido_ = await Pedido.findOrFail(params.id)
    const pedidoJson = pedido_.toJSON()



    if (status.status == 0) {
      pedidoJson.status = 0
    } else if (status.status == 1) {
      pedidoJson.status = 1
    } else if (status.status == 2) {
      pedidoJson.status = 2
    } else if (status.status == 3 ) {
      pedidoJson.status = 3
      pedidoJson.data_hora_finalizado = moment().format();
    }else{
      console.log('Status Inválido');
      response.status(500).send('Status Inválido');
    }
    pedido_.merge(pedidoJson);
    await pedido_.save();
    return pedido_;

  }

  async pedido_finalizado({ params }) {

    const pedido = await Pedido.findOrFail(params.id);
    pedido.data_hora_finalizado = moment().format();
    await pedido.save();
    return pedido;
  }

}

module.exports = PedidoController
