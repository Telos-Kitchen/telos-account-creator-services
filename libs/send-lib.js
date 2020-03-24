import twilio from 'twilio';
import * as Sentry from '@sentry/node'
import { VoipError } from './voip-error';

export async function cleanNumberFormat (smsNumber) {
    const accountSid = process.env.twilioAccountSid; // Your Account SID from www.twilio.com/console
    const authToken = process.env.twilioAuthToken;   // Your Auth Token from www.twilio.com/console
  
    const client = new twilio(accountSid, authToken);

    let numberLookupResult = {};
    let cleanNumber = smsNumber;
    await client.lookups.phoneNumbers(smsNumber)
        .fetch({addOns: ['twilio_carrier_info']})
        .then(phone_number => {
            Sentry.configureScope(scope => scope.setExtra('Twilio Lookup Result', phone_number));
            cleanNumber = phone_number.phoneNumber;
            numberLookupResult = phone_number;
        }); 
    
    if (numberLookupResult.addOns && numberLookupResult.addOns.results.twilio_carrier_info.result.carrier.type === "voip") {
        throw VoipError(`Service does not support numbers from your carrier: ${numberLookupResult.addOns.results.twilio_carrier_info.result.carrier.name}`,
            numberLookupResult.addOns.results.twilio_carrier_info.result);
    }

    return cleanNumber;
}

export async function genSendSMS(smsNumber, message) {
    const accountSid = process.env.twilioAccountSid; // Your Account SID from www.twilio.com/console
    const authToken = process.env.twilioAuthToken;   // Your Auth Token from www.twilio.com/console

    const client = new twilio(accountSid, authToken);

    return await client.messages.create({
        body: message,
        to: smsNumber,
        from: process.env.twilioSmsNumber // From a valid Twilio number
    });
}

export async function sendSMS(smsNumber, otp) {
    const accountSid = process.env.twilioAccountSid; // Your Account SID from www.twilio.com/console
    const authToken = process.env.twilioAuthToken;   // Your Auth Token from www.twilio.com/console

    const client = new twilio(accountSid, authToken);

    return await client.messages.create({
        body: `Your Telos enrollment code is ${otp}`,
        to: smsNumber,
        from: process.env.twilioSmsNumber // From a valid Twilio number
    });
}

export async function sendError (message) {
    await genSendSMS('19196738460', message);
}