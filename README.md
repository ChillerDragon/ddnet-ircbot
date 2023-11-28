# ddnet-ircbot
irc bot for ddnet#developer

buy node v18 or later

ping moderators UwU

---

over 1k lines of code just to ping **@moderators** on discord from irc xxxxxxxxxxxxxxD


## setup

```
# config
cp quiz.csv quiz_secret.csv
cp env.example .env

# build and run
npm i
npx tsc
node dist/index.js
```

Optionally you can also start a podman container with
```
# start or restart and update
./run.sh

# to get logs
podman logs -f ddnet_irc

# to stop
podman kill ddnet_irc
```

## test

Automated unit testes

```
npx ts-node src/test_bash.ts
```

Interactive dry run (no irc)

```
npm run dev
```