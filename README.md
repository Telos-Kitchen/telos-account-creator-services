
# Telos Kitchen SMS Account Creator
Web services for creating free Telos accounts by verifying SMS number.

## Features
- Creates free account for user after verifying SMS
- Hashes SMS number to prevent repeat account creation
- Protects privacy by not saving SMS number or putting SMS hash on chain
- Detects if SMS number is VOIP and responds with error
- Allows client to set both ```active``` and ```owner``` keys
- If requested, can generate keys during creation step or as a separate service (see security note below)
- If requested, can send the private key generated to the user via SMS as a backup (see security note below)
- Utility service can be used to check account name format and availability
- Complete and operational test environment connected to Telos Testnet

### TODO
- [ ] Enable integration with Google Firebase
- [ ] Enable support for Dapps to fund account creation and service hosting using TLOS 
- [ ] Add additional security, such as JWT

## Service Integration
The end points and api key(s) provided in this documentation are rate limited and serve the purpose of allowing wallet/dapp developers to test their integrations. It integrates with the Telos Testnet. 

To verify account creation, you can run:
```
cleos -u https://test.telos.kitchen get account <accountName>
```

or search for your account using your favorite block explorer.

Once you have completed integration testing, you may apply for a production API key by sending an email to ```developers@telos.kitchen```.

### Step 1: Request Verification
This request will send an SMS one-time passcode (Telos Enrollment Code) to the SMS number provided. 
```
curl -X POST \
  https://dev.api.telosapi.com/v1/registrations \
  -H 'x-api-key: BQoDqqyTpG1zriwiwwBZ62nZnVcCI9KQ1j1qUSJc' \
  -d '{
	"smsNumber": "<smsNumber>"
}  '
```

### Step 2: Provide Telos Enrollment Code and Account Details
This request confirms the enrollment code and creates the account based on the account name and the provided keys. 

```
curl -X POST \
  https://dev.api.telosapi.com/v1/accounts \
  -H 'x-api-key: BQoDqqyTpG1zriwiwwBZ62nZnVcCI9KQ1j1qUSJc' \
  -d '{
    "smsNumber": "<smsNumber>",
    "smsOtp": "<telosEnrollmentCode>",
    "telosAccount": "<requestedAccountName>",
    "ownerKey": "EOS6YK2nm32KPtojJ8YziNMhU3Tmk3wt3czXTbehtrUyEiyUvub4Y",
    "activeKey": "EOS6YK2nm32KPtojJ8YziNMhU3Tmk3wt3czXTbehtrUyEiyUvub4Y"
}'
```

NOTE: The services can receive ```telosAccount```, ```ownerKey```, and ```activeKey``` as parameters in either request.

#### Optional Parameters
The ```create``` service also supports generating a key pair directly in the request using the parameter ```generateKeys``` set to a value of ```Y```.  If this parameter is set the keys will be generated and returned using the keyPair attribute in the response. 

```
{
    "smsNumber": "<smsNumber>",
    "smsOtp": "<telosEnrollmentCode>",
    "generateKeys": "Y"
}
```

The client may also request that the ```private key``` that is generated be sent to the user via SMS by setting the ```sendPrivateKeyViaSms``` paramter to ```Y```.

*NOTE: The recommended approach is to generate the key pair on the client and only send the public keys to the service. However, we have provided this feature as a convenience to be used in certain situations. The private key is not saved in the telos-account-creator backend database. That said, it is possible that the private key could be sniffed from the HTTP packets or logged somewhere during processing or in transit. SMS messages are not secure. It is likely that the content of the message is logged by our SMS service provider (Twilio, Firebase, etc) and also by the users' carrier. Use at your own risk. We accept no responsibility for the security of the accounts created using service.*

## Utilities
### Account Checker
Clients can use this web service to check if requested Telos accounts have the right format and are available. 

```
curl \
https://dev.api.telosapi.com/v1/accounts/invalidname9 \
  -H 'x-api-key: BQoDqqyTpG1zriwiwwBZ62nZnVcCI9KQ1j1qUSJc' 
```

The first check is whether the account is the correct format. Since the name ```invalidname9``` is not valid, the service returns ```HTTP 400``` and the following message.
```
{
    "message": "Requested Telos account name invalidname9 is not a valid format. It must match ^([a-z]|[1-5]|[.]){1,12}$"
}
```

If the requested name is the correct format, the service will then check to see if it is available. If it is not available, the service returns ```HTTP 200``` (Account Exists) and the following message:
```
{
    "message": "Requested Telos account name teloskitchen already exists."
}
```

If both checks pass, the service returns ```HTTP 404``` (Not Found) and the following message.
```
{
    "message": "Requested Telos account name solidaccount is valid and available."
}
```

### Key Pair Generator
It is recommended that clients use a local library to generate key pairs and pass the public key to one of the services above. However, clients may use a service that we provide. 

```
curl https://dev.api.telosapi.com/v1/keys \
  -H 'x-api-key: BQoDqqyTpG1zriwiwwBZ62nZnVcCI9KQ1j1qUSJc' 
```

Reponse: 
```
{
    "message": "See attached keys",
    "keys": [
        {
            "privateKey": "5KgsJreyJVpBjFoodRknUCCmT4hfwAUgqKuTBX7jyHTEQVmWD14",
            "publicKey": "EOS7nMV7tMd4CUFJyuTbGgumkK9xW9KNb8Sr6gf28uSyJnci7gSw5"
        },
        {
            "privateKey": "5HrogJdmrhCdkEASJU1n4asUsbVwWAp9nTW5P8eECHMQ1uK9X3B",
            "publicKey": "EOS6aM5QsbnAFqm52tAPwSjSs5oBqXvDFQuGDD6gFEQWP6SU2N8be"
        }
    ],
    "success": "true"
}
```

#### Option: numKeys
The default number of keys to generate is two (2).  A client can pass an optional query string parameter ```numKeys``` to generate more or less.

```
curl https://dev.api.telosapi.com/v1/keys\?numKeys\=4 \
  -H 'x-api-key: BQoDqqyTpG1zriwiwwBZ62nZnVcCI9KQ1j1qUSJc' 
```

Four keys in ```keys``` array in response:
```
{
    "message": "See attached keys",
    "keys": [
        {
            "privateKey": "5KkgP3jP2VNpZHwhqmXZa6mUdq9MF5pHv2858nikQCcRX9yuPVE",
            "publicKey": "EOS7ZQSdPv2uyRzzNp3ZpZngwq2BeKt3z6H3RQDjt8SRXLXs17WbM"
        },
        {
            "privateKey": "5K41ewbZiDRDtExyX3ZLqCScStAFoNpn64MrhFVtmoyzkA43iZm",
            "publicKey": "EOS5cA4gty7RXtJurPauKJdccfRzd2kJ7QsoAv9SCZipP5dxH6ocK"
        },
        {
            "privateKey": "5Kidxxmnb5toHuHPmR6xSNyeWhURptuUoPe4g5D6uaNuxdD63Qo",
            "publicKey": "EOS82ofhJX16rVsJKmidJKyySxDzCRQQUJPa7KwgRweZgKPCJD14m"
        },
        {
            "privateKey": "5Jp96GHAgn6TLpeHYyreS2GeENjiiGHooXhjAnd3V6SYBBcuD6d",
            "publicKey": "EOS7ZoPK65KZzJze7qrDeWPA81E5aKsfywa7pdgrqH8oHLZ9Bwbk3"
        }
    ],
    "success": "true"
}
```

### Delete Record (for DEV only)
A core feature of the service is that it limits each unique SMS number to only one Telos account. This is achieved by hashing the SMS number and checking used hashes before allowing new registrations.

However, during testing, developers will obviously want to use their number multiple times. There is a ```delete``` service available in the ```development``` environment only. 

You may delete an SMS number from the used hash table like this: 
```
curl -X DELETE \
  https://dev.api.telosapi.com/v1/accounts \
  -H 'x-api-key: BQoDqqyTpG1zriwiwwBZ62nZnVcCI9KQ1j1qUSJc' \
  -d '{
	"smsNumber": "<smsNumber>"
}  '
```

## Issues / Questions
Please create Gitlab issue.

## Contributing
Please submit pull request.

## Appreciation
To show appreciation, please vote for Telos Kitchen for Block Producer, and/or you may send token contributions to Telos account ```teloskitchen``` to support hosting and SMS expenses of this service.