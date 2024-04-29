"use strict";

import config from "./config.mjs";
import { MatrixClient, RichRepliesPreprocessor } from "matrix-bot-sdk";
import { Client } from "ssh2";
import { readFileSync } from "fs";

let user_id;
let shell;

const client = new MatrixClient(config.homeserver, config.token);
const ssh = new Client();
const start = new Date().getTime();

function dlog(...data) {
    if (config.debug) console.info("[DEBUG]", ...data);
}

async function on_room_message(room_id, event) {
    if (
        new Date().getTime() - start < 5000 ||
        !event["content"] ||
        !event["content"]["body"] ||
        event["sender"] === user_id ||
        !shell
    )
        return;

    if (
        event["content"]["m.relates_to"] &&
        event["content"]["m.relates_to"]["m.in_reply_to"]
    ) {
        let evt = await client.getEvent(
            room_id,
            event["content"]["m.relates_to"]["m.in_reply_to"]["event_id"],
        );

        dlog(`Matrix -> SSH: ${evt["content"]["body"]}`);

        shell.write(
            `in reply to ${evt["sender"]}: ${evt["content"]["body"]}:\r\n`,
        );
    }

    dlog(`Matrix -> SSH: ${event["content"]["body"]}`);

    shell.write(
        `${event["sender"]} in ${await client.getPublishedAlias(room_id)}: ${event["content"]["body"]}\r\n`,
    );
}

async function main() {
    client.addPreprocessor(new RichRepliesPreprocessor(false));

    await client.start().then(async () => {
        user_id = await client.getUserId();
        console.log(`Bot started! User ID: ${user_id}`);
    });

    client.on("room.message", async (room_id, event) => {
        try {
            await on_room_message(room_id, event);
        } catch (e) {
            console.error(e);
            client.replyText(room_id, event, "Error!");
        }
    });

    ssh.on("ready", () => {
        dlog("SSH client ready");

        ssh.shell((err, stream) => {
            if (err) throw err;

            dlog("Spawned a remote shell");

            stream.write("/theme mono\r\n");

            stream.on("close", () => {
                dlog("Shell closed");
                shell = null;
                conn.end();
            });

            shell = stream;

            stream.on("data", (data) => {
                if (new Date().getTime() - start < 5000) return;

                data = data.toString().trim();

                if (data[0] == "*" || data.match(/^[a-zA-Z0-9_-]+: .+$/)) {
                    dlog(`SSH -> Matrix: ${data}`);

                    client
                        .getJoinedRooms()
                        .then((rooms) => {
                            rooms.forEach((room_id) => {
                                dlog(`Sending message to ${room_id}...`);

                                client
                                    .sendMessage(room_id, {
                                        msgtype: "m.notice",
                                        body: data,
                                    })
                                    .catch(() => {});
                            });
                        })
                        .catch(() => {});
                }
            });
        });
    }).connect({
        host: config.ssh,
        port: config.sshp,
        username: config.user,
        privateKey: readFileSync("/root/.ssh/id_ed25519"),
        publicKey: readFileSync("/root/.ssh/id_ed25519.pub"),
    });
}

dlog("Hello, Debug!");
main();
