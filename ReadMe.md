
# SequentialRead Password Manager

This is a Golang / HTML5  / vanilla JavaScript web-application which stores encrypted text files in three places:

 - `localStorage` in the browser
 - on disk next to the HTTP server binary
 - in a Backblaze B2 bucket

![screenshot](readme/screenshot.png)

[Try it! (https://pwm.sequentialread.com) ](https://pwm.sequentialread.com)

OR run it yourself in docker:

```
docker run \
  -p 8073:8073 \
  -v "/Users/exampleUser/Desktop/encrypted-passwords:/data" \
  -e SEQUENTIAL_READ_PWM_AWS_ACCESS_KEY_ID=EXAMPLE77f599784EXAMPLE \
  -e SEQUENTIAL_READ_PWM_AWS_SECRET_ACCESS_KEY=EXAMPLEEXAMPLEEXAMPLEEXAMPLEKEY \
  -e SEQUENTIAL_READ_PWM_S3_BUCKET_NAME=sequentialread-password-manager \
  -e SEQUENTIAL_READ_PWM_S3_BUCKET_REGION=us-west-000 \
  sequentialread/sequentialread-password-manager:2.0.0
```

See "Hosting it yourself" for more information.

## Security

First and foremost, the application is easy to audit since it has only one dependency: sjcl.js, AKA the Stanford JavaScript Crypto Library.

You can re-produce the sjcl.js I am using like so: 

```
git clone https://github.com/bitwiseshiftleft/sjcl
cd sjcl
./configure --without-all --with-ccm --with-sha256 --with-codecBase64 --with-codecHex --with-codecString --with-hmac --with-codecBytes --with-convenience
make
```

There is nothing that pulls in dependencies, no bundling step, etc. There is only one place where `XMLHttpRequest` is created, and the request body is encrypted in the same place. Same goes for `localStorage`.

It was designed that way to strengthen the claim that "everything it sends out from the javascript VM is AES encrypted with the key you chose".

## High Avaliability by Design

 It uses the [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) to ensure that even if my server goes down, the app still loads.

 It also has its own AWS Credential with access to the bucket, so you can still access S3 if my server goes down.

 It will also work even if your device has no internet connection, of course any changes will not be sent to the server or to S3 until you connect again and prompt the app to update the file again.

 It uses a naive approach to keep all 3 data stores in sync: When writing, it will attempt to write to all 3 and tolerate failures. When reading, it will compare the `lastUpdated` timestamps on all versions that it received, and if they don't match or if one is missing, it will issue a `PUT` with the most up-to-date version.

 That means if you happen to make conflicting changes, there is no real conflict resolution. The latest one wins.

## Encryption Key User Interface Disclaimer

You are allowed to use whatever seed you want for your AES key. If you pick a weak seed and get hacked, that is your fault. The application warned you about it. It was even red, bold and underlined!

The application includes a timestamp + mouse-movement + SHA256 based entropy generator to create a secure ~128 bit key, encoded in base 10,000. It will appear as a collection of a few english words/phrases. An example:

`bedrooms confirmation decor generic wondering temperatures bm retreat beer`

Assuming the attacker had access to the ciphertext and could use [top-of-the-line hardware](https://en.bitcoin.it/wiki/Mining_hardware_comparison) (A Bitmain Antminer S9 in this case), how long would it take to guess every possible combination of words? [A very, VERY long time](https://www.wolframalpha.com/input/?i=(10000%5E9)%2F(1.4e%2B13)+seconds+in+years)

For comparison, under the same scenario, a key with only 4 words would be cracked within **10 Minutes**.

Does that mean a key with 4 words is not secure enough? It might depend on the situation.

Casual remote attackers probably won't have access to the ciphertext since they would have to look at your localstorage or guess a gazzillion things over HTTP. I just put a scary disclaimer on the app since I don't want to be holding people's weakly encrypted data.

## License

 This software is provided "AS-IS" under the MIT license. For more information see the `LICENSE` file.

## Hosting it yourself

When you are creating the backblaze bucket, make sure you enable "Files in bucket are public". 

![screenshot of bucket configuruation](readme/bucket.png)

You will also have to enable cors on the bucking.  Enabling CORS in the UI will not work, you have to manually enable it on the bucket using the backblaze API. Make sure you set `exposeHeaders`, otherwise it won't work. This seems like a backblaze bug :(

```
BACKBLAZE_KEY_ID=""
BACKBLAZE_SECRET_KEY=""
BUCKET_NAME="sequentialread-password-manager"
KEY_NAME="sequentialread-password-manager"

AUTH_JSON="$(curl -sS -u "$BACKBLAZE_KEY_ID:$BACKBLAZE_SECRET_KEY" https://api.backblazeb2.com/b2api/v1/b2_authorize_account)"
AUTHORIZATION_TOKEN="$(echo "$AUTH_JSON" | jq -r .authorizationToken)"
ACCOUNT_ID="$(echo "$AUTH_JSON" | jq -r .accountId)"
API_URL="$(echo "$AUTH_JSON" | jq -r .apiUrl)"

BUCKET_ID="$(curl -sS -H "Authorization: $AUTHORIZATION_TOKEN" "$API_URL/b2api/v2/b2_list_buckets?accountId=$ACCOUNT_ID&bucketName=$BUCKET_NAME" | jq -r .buckets[0].bucketId)"

curl -X POST -H "Authorization: $AUTHORIZATION_TOKEN" -H "Content-Type: application/json" "$API_URL/b2api/v2/b2_update_bucket" -d '{
      "accountId": "'"$ACCOUNT_ID"'",
      "bucketId": "'"$BUCKET_ID"'",
      "corsRules": [
        {
          "allowedHeaders": [ "*" ],
          "allowedOperations": [
            "s3_head",
            "s3_get",
            "s3_put"
          ],
          "allowedOrigins": [ "*" ],
          "exposeHeaders": null,
          "corsRuleName": "s3DownloadFromAnyOrigin",
          "maxAgeSeconds": 3600
        }
      ]
}'


```


You have to create the backblaze application key using the API because the web interface wont let your manually select the specific capabilities for the key.

Creating the Backblaze application key which is limited to the bucket & can't list the files in the bucket:

```
BACKBLAZE_KEY_ID=""
BACKBLAZE_SECRET_KEY=""
BUCKET_NAME="sequentialread-password-manager"
KEY_NAME="sequentialread-password-manager"

AUTH_JSON="$(curl -sS -u "$BACKBLAZE_KEY_ID:$BACKBLAZE_SECRET_KEY" https://api.backblazeb2.com/b2api/v1/b2_authorize_account)"
AUTHORIZATION_TOKEN="$(echo "$AUTH_JSON" | jq -r .authorizationToken)"
ACCOUNT_ID="$(echo "$AUTH_JSON" | jq -r .accountId)"

BUCKET_ID="$(curl -sS -H "Authorization: $AUTHORIZATION_TOKEN" "$API_URL/b2api/v2/b2_list_buckets?accountId=$ACCOUNT_ID&bucketName=$BUCKET_NAME" | jq -r .buckets[0].bucketId)"

curl -X POST -H "Authorization: $AUTHORIZATION_TOKEN" -H "Content-Type: application/json" "$API_URL/b2api/v2/b2_create_key" -d '{"accountId": "'"$ACCOUNT_ID"'", "capabilities": ["listBuckets", "readFiles", "writeFiles"], "keyName": "'"$KEY_NAME"'", "bucketId": "'"$BUCKET_ID"'"}'

```

My bucket S3 API endpoint (displayed under the bucket in the backblaze web interface) was `s3.us-west-000.backblazeb2.com`.

When setting the environment variables, I set them like this: 

```
SEQUENTIAL_READ_PWM_S3_BUCKET_NAME=sequentialread-password-manager
SEQUENTIAL_READ_PWM_S3_BUCKET_REGION=us-west-000
SEQUENTIAL_READ_PWM_AWS_ACCESS_KEY_ID=0003ea77f5997840000000015
SEQUENTIAL_READ_PWM_AWS_SECRET_ACCESS_KEY=EXAMPLEEXAMPLEEXAMPLEEXAMPLE
```