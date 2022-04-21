exports.schema = {
    product: {
        isMongoId: true,
        isEmpty: false
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