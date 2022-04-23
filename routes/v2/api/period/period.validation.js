exports.schema = {
    chickenShed: {
        isMongoId: true,
        isEmpty: false
    },
    population: {
        isInt: true,
        toInt: true
    },
    DOC: {
        isMongoId: true,
        isEmpty: false
    },
    priceDOC: {
        isInt: true,
        toInt: true
    },
    startDate: {
        isDate: true,
        toDate: true
    },
    finishDate: {
        isDate: true,
        toDate: true
    },
    isEnd: {
        isBoolean: true
    },
    isPartnership: {
        isBoolean: true
    }
}