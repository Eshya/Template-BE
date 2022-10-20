
 function arrLimit(c) {
    return this.filter((x, i) => {
        if(i <= c -1){return true}
    })
}

function arrSkip(c) {
    return this.filter((x, i) => {
        if(i > c){return true}
    })
}

exports.arrLimit = arrLimit
exports.arrSkip = arrSkip