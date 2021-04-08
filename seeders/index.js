const fs = require('fs')
const path = require('path')
const db = require('../configs/db.conf')

db.connect()

const rolesPath = path.join(__dirname, '..', 'seeders', 'roles.json')
const usersPath = path.join(__dirname, '..', 'seeders', 'users.json')

const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'))
const userData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))

const Roles = require('../routes/api/roles/roles.model')
const Users = require('../routes/api/users/users.model')

const passwordHash = require('password-hash')

exports.createRoles = async (role) => {
    const defaultRole = await Roles.findOneAndUpdate({name: role.name}, role, {upsert: true, new: true}).exec()
    console.log(`${defaultRole.name} role created`)
    return defaultRole
}
exports.createUser = async (user) => {
    if(user.role) {
        const role = await Roles.findOne({name: user.role})
        console.log(role)
        user.role = role._id
    }
    const isUserExist = await Users.findOne({username: user.username}).select('_id password name email role');
    if(!isUserExist){
        if(user.password){
            const hash = passwordHash.generate(user.password, {saltLength: 10})
            user.password = hash
        }
        const newUser = await Users.create(user, {new: true})
        return newUser
    }
}
const addRoles = rolesData.map((role) => this.createRoles(role))
Promise.all(addRoles).then((role) => {
  userData.forEach((user) => {
      this.createUser(user)
  })
})
