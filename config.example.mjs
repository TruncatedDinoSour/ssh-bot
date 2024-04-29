"use strict";

const config = {
    homeserver:
        "https://matrix.ari.lt/" /* The full matrix homeserver, not just the delegated domain */,
    token: "..." /* The access token of the bot account */,
    ssh: "s.ari.lt" /* The SSH-chat address */,
    sshp: 6969 /* The SSH-chat port */,
    debug: false /* Debug mode */,
    user: "ssh" /* The ssh-chat username */,
};

export default config;
