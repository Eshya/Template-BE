const fetch = require('node-fetch')

exports.permit = (...role) => {
    return (req, res, next) => {
        const { user } = req
        if(user && role.includes(user.role.name)){
            next()
        } else {
            res.json({error: 1018, message: "forbidden"})
        }
    }
}

exports.permitPPL = async (req, res, next) => {
    const {user} = req
    const token = req.headers['authorization']
    var urlAuth = process.env.AUTH_URL || `https://staging-auth.chickinindonesia.com`
    // console.log(urlAuth)
    const findUser = await fetch(`https://${urlAuth}/api/users/` + user._id, {
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)
    if (user.role.name == "ppl" && findUser.isPPLActive === false) {
        res.json({error: 1017, message: "you have no permition!"})
    } else{
        next()
    }
}