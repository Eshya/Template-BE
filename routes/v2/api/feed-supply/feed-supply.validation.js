exports.schema = {
    product: {
        isMongoId: true,
        isEmpty: false
    },
    zak: {
        isFloat: true
    },
    quantity: {
        isFloat: true
    },
    stock: {
        isFloat: true
    },
    price: {
        isInt: true,
        toInt: true
    }
}