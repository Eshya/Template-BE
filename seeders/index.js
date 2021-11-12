const fs = require('fs')
const path = require('path')
const db = require('../configs/db.conf')

db.connect()

const rolesPath = path.join(__dirname, '..', 'seeders', 'roles.json')
const usersPath = path.join(__dirname, '..', 'seeders', 'users.json')
const tipeKandangPath = path.join(__dirname, '..', 'seeders', 'tipe-kandang.json')
const jenisDOCPath = path.join(__dirname, '..', 'seeders', 'jenis-DOC.json')
const produkPath = path.join(__dirname, '..', 'seeders', 'produk.json')
const dataPath = path.join(__dirname, '..', 'seeders', 'data.json')


const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf-8'))
const userData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))
const tipeKandangData = JSON.parse(fs.readFileSync(tipeKandangPath, 'utf-8'))
const jenisDOCData = JSON.parse(fs.readFileSync(jenisDOCPath, 'utf-8'))
const produkData = JSON.parse(fs.readFileSync(produkPath, 'utf-8'))
const dataData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

const Roles = require('../routes/api/roles/roles.model')
const Users = require('../routes/api/users/users.model')
const TipeKandang = require('../routes/api/tipe-kandang/tipe-kandang.model')
const JenisDOC = require('../routes/api/jenis-DOC/jenis-DOC.model')
const Produk = require('../routes/api/produk/produk.model');
const Data = require('../routes/api/data/data.model')

const passwordHash = require('password-hash')

exports.createTipeKandang = async (tipeKandang) => {
    const isTipeKandangExist = await TipeKandang.findOne({tipe: tipeKandang.tipe})
    if(!isTipeKandangExist){
        const newTipeKandang = await TipeKandang.create(tipeKandang)
        return newTipeKandang;
    }
}

exports.createJenisDOC = async (jenisDOC) => {
    const isJenisDOCExist = await JenisDOC.findOne({name: jenisDOC.name})
    if(!isJenisDOCExist){
        const defaultJenisDOC = await JenisDOC.create(jenisDOC);
        return defaultJenisDOC;
    }
}

exports.createProduk = async (produk) => {
    const isProdukExist = await Produk.findOne({merk: produk.merk})
    if(!isProdukExist){
        const defaultProduk = await Produk.create(produk);
        return defaultProduk;
    }
}

exports.createData = async (data) => {
    const isDataExist = await Data.findOne({day: data.day})
    if(!isDataExist){
        const defaultData = await Data.create(data);
        return defaultData;
    }
}

// exports.createRoles = async (role) => {
//     const defaultRole = await Roles.findOneAndUpdate({name: role.name}, role, {upsert: true, new: true}).exec()
//     console.log(`${defaultRole.name} role created`)
//     return defaultRole
// }
// exports.createUser = async (user) => {
//     if(user.role) {
//         const role = await Roles.findOne({name: user.role})
//         console.log(role)
//         user.role = role._id
//     }
//     const isUserExist = await Users.findOne({username: user.username}).select('_id password name email role');
//     if(!isUserExist){
//         if(user.password){
//             const hash = passwordHash.generate(user.password, {saltLength: 10})
//             user.password = hash
//         }
//         const newUser = await Users.create(user, {new: true})
//         return newUser
//     }
// }
// const addRoles = rolesData.map((role) => this.createRoles(role))
// Promise.all(addRoles).then((role) => {
//   userData.forEach((user) => {
//       this.createUser(user)
//   })
// })

// const addTipeKandang = tipeKandangData.map((tipeKandang) => this.createTipeKandang(tipeKandang))
// const addJenisDOC = jenisDOCData.map((jenisDOC) => this.createJenisDOC(jenisDOC));
// const addProduk = produkData.map((produk) => this.createProduk(produk));
const addData = dataData.map((data) => this.createData(data))
// Promise.all(addTipeKandang).then((results) => {
//     console.log(results);
// })

// Promise.all(addJenisDOC).then((results) => {
//     console.log(results);
// })

Promise.all(addData).then((results) => {
    console.log(results);
})

// Promise.all(addProduk).then((results) => {
//     console.log(results);
// })
