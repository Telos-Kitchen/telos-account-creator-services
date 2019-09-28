
# Telos Kitchen SMS Account Creator
Web services for creating free Telos accounts by verifying SMS number.

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
  https://dev.accounts.telosapi.com/register \
  -H 'x-api-key: ABK19jhYsW12Wny6LglV895szlG2QtOHang93J1T' \
  -d '{
	"smsNumber": "<smsNumber>"
}  '
```

### Step 2: Provide Telos Enrollment Code and Account Details
This request confirms the enrollment code and creates the account based on the account name and the provided keys. 

```
curl -X POST \
  https://dev.accounts.telosapi.com/create \
  -H 'x-api-key: ABK19jhYsW12Wny6LglV895szlG2QtOHang93J1T' \
  -d '{
    "smsNumber": "<smsNumber>",
    "smsOtp": "<telosEnrollmentCode>",
    "eosioAccount": "<requestedAccountName>",
    "ownerKey": "EOS6YK2nm32KPtojJ8YziNMhU3Tmk3wt3czXTbehtrUyEiyUvub4Y",
    "activeKey": "EOS6YK2nm32KPtojJ8YziNMhU3Tmk3wt3czXTbehtrUyEiyUvub4Y"
}'
```

NOTE: The services can receive ```eosioAccount```, ```ownerKey```, and ```activeKey``` as parameters in either request.

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
### Account Exists Checker
Clients can use this web service to check if Telos accounts exist or not. This endpoint does not require the API key. 

```
curl \
https://dev.accounts.telosapi.com/exists\?accountName\=teloskitchen
```

The response contains an attribute for ```exists```, which is either true or false.

Account exists:
```
{
    "accountName": "teloskitchen",
    "exists": true,
    "success": "true"
}
```

Account does not exist:
```
{
    "accountName": "sdskflsdj",
    "exists": false,
    "success": "true"
}
```

### Key Pair Generator
It is recommended that clients use a local library to generate key pairs and pass the public key to one of the services above. However, clients may use a service that we provide. 

```
curl https://dev.accounts.telosapi.com/keygen
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
curl https://dev.accounts.telosapi.com/keygen\?numKeys\=4
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
curl -X POST \
  https://dev.accounts.telosapi.com/delete \
  -H 'x-api-key: ABK19jhYsW12Wny6LglV895szlG2QtOHang93J1T' \
  -d '{
	"smsNumber": "<smsNumber>"
}  '
```