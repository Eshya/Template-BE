exports.schema = {
    name: {
        isString: true,
        isEmpty: false,
    },
    address: {
        isString: true,
        isEmpty: false,
    },
    type: {
        isString: true,
        isEmpty: false,
    },
    capacity: {
        isInt: true,
        isEmpty: false,
        trim: true
    }
}