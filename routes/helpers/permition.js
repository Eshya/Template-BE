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
