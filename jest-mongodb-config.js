module.exports = {
    mongodbMemoryServerOptions: {
        instance: {
            dbName: "test"
        },
        binary: {
            version: '5.0.7',
            skipMD5: true
        },
        autoStart: false,
        useSharedDBForAllJestWorkers: false,
    }
}