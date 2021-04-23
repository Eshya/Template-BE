exports.schema = {
    beratPakan: {
        isFloat: {errorMessage: 'must be a decimal'},
        isEmpty: false,
    },
    beratBadan: {
        isFloat: {errorMessage: 'must be a decimal'},
        isEmpty: false
    }
}