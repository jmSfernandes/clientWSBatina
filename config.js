let config = {
    ip: 'localhost',
    service: 'batina_test',
    port:8443,
    port_subscriptions:8080,
    ssl_key:'keys/server.key',
    ssl_cert:'keys/server.crt'
};

config.as_uri = `http://${config.ip}:${config.port}/`;

module.exports = config;

