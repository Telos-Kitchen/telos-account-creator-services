const { Api, JsonRpc, RpcError } = require("eosjs");
const { JsSignatureProvider } = require("eosjs/dist/eosjs-jssig"); 
const fetch = require("node-fetch"); // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require("util");
import { getSecret } from "./auth-lib";

export async function create(accountName, ownerKey, activeKey) {

  const secret = await getSecret(process.env.tkOracleSecretKey);
  var secretStringObj = JSON.parse(secret.SecretString);
  const pk = secretStringObj[process.env.tkOracleSecretKey];

  const signatureProvider = new JsSignatureProvider([pk]);
  const rpc = new JsonRpc(process.env.eosioApiEndPoint, { fetch } );

  const api = new Api({
    rpc,
    signatureProvider,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder()
  });

  const actions = [
    {
      account: process.env.tkAccountCreator,
      name: "create",
      authorization: [
        {
          actor: process.env.tkOracle,
          permission: "active"
        }
      ],
      data: {
        account_to_create: accountName,
        owner_key: ownerKey,
        active_key: activeKey
      }
    }
  ];
  console.log("EOSLIB-CREATE::CREATE-- Actions: ", JSON.stringify(actions));
  const result = await api.transact({ actions: actions }, { blocksBehind: 3, expireSeconds: 30 });
  console.log("EOSLIB-CREATE::CREATE-- Result:", JSON.stringify(result));
  return result;
}

export async function genRandomKey () {
  const ecc = require ("eosjs-ecc");
  let key = {};
  key.privateKey = await ecc.randomKey();
  key.publicKey = await ecc.privateToPublic(key.privateKey);
  return key;
}

export async function genRandomKeys (numKeys = 2) {
  let keys = [];
  for (var i=0; i < numKeys; i++) {
    keys.push (await genRandomKey());
  }
  return keys;
}

export async function accountExists (accountName) {
  const rpc = new JsonRpc(process.env.eosioApiEndPoint, { fetch } );
  try {
    await rpc.get_account(accountName);
    return true;
  } catch (e) {
    return false;
  }
}

export async function validAccountFormat (accountName) {

  var telosAccountRegex = RegExp("^([a-z]|[1-5]|[\.]){1,12}$", "g"); // does it match EOSIO account format?
  if (!telosAccountRegex.test(accountName)) {
    return false;
  }
  return true;
}