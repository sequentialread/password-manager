
# SequentialRead Password Manager

[Try it! (https://pwm.sequentialread.com) ](https://pwm.sequentialread.com)

OR run it yourself in docker:

```
docker run \
  -p 8073:8073 \
  -v "/Users/exampleUser/Desktop/encrypted-passwords:/data" \
  -e SEQUENTIAL_READ_PWM_AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
  -e SEQUENTIAL_READ_PWM_AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  sequentialread/sequentialread-password-manager:0.0.0
```

This is a Golang / HTML5  / vanilla JavaScript web-application which stores encrypted text files in three places:

 - `localStorage` in the browser
 - on disk next to the HTTP server binary
 - in an Amazon S3 bucket

![screenshot](screenshot.png)

## Security

First and foremost, the application is easy to audit since it has only one dependency: sjcl.js, AKA the Stanford JavaScript Crypto Library.

There is nothing that pulls in dependencies, no bundling step, etc. There is only one place where `XMLHttpRequest` is created, and the request body is encrypted in the same place. Same goes for `localStorage`.

It was designed that way to strengthen the claim that "everything it sends out from the javascript VM is AES encrypted with the key you chose".

## High Avaliability by Design

 It uses the [HTML5 Application Cache](https://webcache.googleusercontent.com/search?q=cache:ih81QOzVxasJ:https://alistapart.com/article/application-cache-is-a-douchebag) to ensure that even if my server goes down, the app still loads.

 It also has its own AWS Credential with access to the bucket, so you can still access S3 if my server goes down.

 It will also work even if your device has no internet connection, of course any changes will not be sent to my server or to S3 until you can connect again.

 It uses a naive approach to keep all 3 data stores in sync: When writing, it will attempt to write to all 3 and tolerate failures. When reading, it will compare the `lastUpdated` timestamps on all versions that it received, and if they don't match, it will issue a `PUT` with the most up-to-date version.

 That means if you happen to make conflicting changes, there is no real conflict resolution. The latest one wins.

 ## Encryption Key User Interface Disclaimer

 You are allowed to use whatever seed you want for your 256 bit AES key. If you pick a weak seed and get hacked, that is your fault. The application warned you about it. It was even red, bold and underlined!

 The application includes an HMAC/mouse-movement based entropy generator to create a secure key encoded in base 10,000. It will appear as a collection of a few english words/phrases. An example:

 `bedrooms confirmation decor generic wondering temperatures bm retreat beer`

 ## License

 This software is provided "AS-IS" under the MIT license. For more information see the `LICENSE` file.
