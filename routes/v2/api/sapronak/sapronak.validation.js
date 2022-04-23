exports.schema = {
    period: {
        isMongoId: true,
        isEmpty: false
    },
    date: {
        isDate: true,
        toDate: true
    },
    notes: {
        isString: true
    }
}