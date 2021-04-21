const fs = require('fs')
const path = require('path')
const db = require('../configs/db.conf')

db.connect()

const rolesPath = path.join(__dirname, '..', 'seeders', 'roles.json')
const usersPath = path.join(__dirname, '..', 'seeders', 'users.json')
const tipeKandangPath = path.join(__dirname, '..', 'seeders', 'tipe-kandang.json')
const jenisDOCPath = path.join(__dirname, '..', 'seeders', 'jenis-DOC.json')

const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'))
const userData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))
const tipeKandangData = JSON.parse(fs.readFileSync(tipeKandangPath, 'utf-8'))
const jenisDOCData = JSON.parse(fs.readFileSync(jenisDOCPath, 'utf-8'))

const Roles = require('../routes/api/roles/roles.model')
const Users = require('../routes/api/users/users.model')
const TipeKandang = require('../routes/api/tipe-kandang/tipe-kandang.model')
const JenisDOC = require('../routes/api/jenis-DOC/jenis-DOC.model')

const passwordHash = require('password-hash')

exports.createTipeKandang = async (tipeKandang) => {
    const isTipeKandangExist = await TipeKandang.findOne({name: tipeKandang.name})
    if(!isTipeKandangExist){
        const newTipeKandang = await TipeKandang.create(tipeKandang)
        return newTipeKandang;
    }
}

exports.createJenisDOC = async (jenisDOC) => {
    const defaultJenisDOC = await JenisDOC.create(jenisDOC);
    return defaultJenisDOC;
}

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

const addTipeKandang = tipeKandangData.map((tipeKandang) => this.createTipeKandang(tipeKandang))
const addJenisDOC = jenisDOCData.map((jenisDOC) => this.createJenisDOC(jenisDOC));
Promise.all(addTipeKandang).then((results) => {
    console.log(results);
})

Promise.all(addJenisDOC).then((results) => {
    console.log(results);
})
