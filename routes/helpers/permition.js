exports.permit = (...role) => {
    return (req, res, next) => {
        const { user } = req
        console.error(user);
        if(user && role.includes(user.role.name)){
            next()
        } else {
            res.status(403).json({
                message: "forbidden"
            })
        }
    }
}

exports.permitPPL = (req, res, next) => {
    const {user} = req
    console.log(user)
    if (user.role.name == "ppl" && user.isPPLActive === false) {
        res.json({error: 1017, message: "you have no permition!"})
    } else{
        next()
    }
}