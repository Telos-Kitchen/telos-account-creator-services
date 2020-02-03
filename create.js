import { respond } from './libs/response-lib';
import * as dynamoDbLib from "./libs/dynamodb-lib";
import * as sendLib from "./libs/send-lib";
import * as cryptoLib from "./libs/crypto-lib";
import * as eosioLib from "./libs/eosio-lib";
import * as Sentry from '@sentry/node'

export async function main(event, context) {
  Sentry.init({ dsn: process.env.sentryDsn });
  Sentry.configureScope(scope => scope.setExtra('Request Body', event.body));

  const data = JSON.parse(event.body);

  if (!data.smsNumber || !data.smsOtp) {
    return respond(400, { message: "smsNumber and smsOtp are required"});
  }

  if ( (data.sendPrivateKeyViaSms && data.sendPrivateKeyViaSms === "Y") && 
      ((!data.generateKeys || data.generateKeys !== "Y" ) && 
       (!data.privateKey))) {
      return respond(400, { message: "sendPrivateKeyViaSms parameter can only be used if generateKeys is set to Y or the client passes the privateKey directly"});
  }

  try {
    const smsNumber = await sendLib.cleanNumberFormat(data.smsNumber);
    const smsHash = await cryptoLib.hash(smsNumber);

    const accountRecord = await dynamoDbLib.getBySmsHash (smsHash);
    console.log("ACCOUNT RECORD: ", JSON.stringify(accountRecord));
    if (accountRecord.accountCreatedAt > 0) {
      return respond(403, { message: `This SMS number ${smsNumber} has already received a free Telos account via this service. Use SQRL or another wallet to create another account.`});
    }

    let result, keyPair;
    if (data.smsOtp != accountRecord.smsOtp) {
      return respond(403, { message: `The OTP provided does not match: ${data.smsOtp}. Permission denied.`});
    }

    if (data.telosAccount) { 
      if (!await eosioLib.validAccountFormat(data.telosAccount)) {
        return respond(400, { message: `Requested Telos account name (${data.telosAccount}) is not a valid format. It must match ^([a-z]|[1-5]|[\.]){1,12}$`});
      }
      if (await eosioLib.accountExists(data.telosAccount)) {
        return respond(400, { message: `Requested Telos account name (${data.telosAccount}) already exists.`});
      }
      accountRecord.telosAccount = data.telosAccount; 
    }
    
    if (data.activeKey) { accountRecord.activeKey = data.activeKey; }
    if (data.ownerKey) { accountRecord.ownerKey = data.ownerKey; }

    let response = {};
    let message = `Telos account ${accountRecord.telosAccount} was created.`;

    if (data.generateKeys && data.generateKeys === "Y") {
      message = message + ` Key pair was generated by the service and NOT saved. See attached for keyPair used for owner and active.`;
      keyPair = await eosioLib.genRandomKey();
      accountRecord.activeKey = keyPair.publicKey;
      accountRecord.ownerKey = keyPair.publicKey;
      response.keyPair = keyPair;
    }
    
    if (!accountRecord.telosAccount) {
      return respond(400, { message: `telosAccount is not available. This must be transmitted to either the register or create service. See API docs for more info.`});
    } 
    if (!accountRecord.activeKey || !accountRecord.ownerKey) {
      return respond(400, { message: `activeKey or ownerKey is not available. These must be transmitted to either the register or create service or transmit option generateKeys=Y. See API docs for more info.`});
    }
    result = await eosioLib.create (accountRecord.telosAccount, accountRecord.ownerKey, accountRecord.activeKey);

    if (data.sendPrivateKeyViaSms && data.sendPrivateKeyViaSms === "Y") {
      let privateKey;
      if (data.privateKey) {
        privateKey = data.privateKey;
      } else {
        privateKey = keyPair.privateKey;
      }
      const msg = await sendLib.genSendSMS(smsNumber, `Important: Keep in a safe place: ${privateKey}`);
      accountRecord.pkSid = msg.sid;
      message = message + ` Private key was also sent via SMS. SID: ${msg.sid}.`;
    }

    accountRecord.accountCreatedAt = Date.now();
    accountRecord.result = JSON.stringify(result);
    console.log("CREATE::MAIN:: Account record to save: ", JSON.stringify(accountRecord));
    await dynamoDbLib.save (accountRecord);

    response.message = message;
    response.result = result;
    return respond(200, response);
  } catch (e) {
    Sentry.captureException(e);
    await Sentry.flush(2500);
    return respond(500, { message: e.message });
  }
}
