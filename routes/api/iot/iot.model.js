const db = require('../../../configs/db.conf');
const helper = require('../../helpers');

exports.getWhere = async (fields, params) => {
    const rows = await db.query(`SELECT p.* FROM perangkat as p INNER JOIN users as u ON p.user_id = u.id WHERE u.`+fields+ ` = ? `, [params]);
    const data = helper.emptyOrRows(rows);

    return data;
}

exports.getWhereId = async (fields, params) => {
    const rows = await db.query(`SELECT * FROM perangkat WHERE `+fields+`= ? `, [params]);
    const data = helper.emptyOrRows(rows);

    return data;
}

exports.getUser = async (fields, params) => {
    const rows = await db.query(`SELECT * FROM users WHERE `+fields+`= ?`,[params])
    const data = helper.emptyOrRows(rows);

    return data;
}

exports.getFlock = async (params) => {
    const rows = await db.query(`SELECT * FROM perangkat WHERE id_device = ?`, [params])
    const data = helper.emptyOrRows(rows);

    return data;
}

exports.update = async (fields, params, data) => {
    const rows = await db.query(`SELECT * FROM perangkat WHERE `+fields+` = ?`, [params]);
    const query = await db.query(`UPDATE perangkat SET user_id = ?, id_device = ?, nama = ?, mode = ?, status = ?, suhu_aktual = ?, suhu_batas_nyala = ?, suhu_batas_mati = ?, kelembapan_aktual = ?, kelembapan_batas_nyala = ?, kelembapan_batas_mati = ?, jam_mati = ?, menit_mati = ?, detik_mati = ? WHERE `+fields+ ` = ? `, [
        rows[0].user_id, rows[0].id_device, rows[0].nama, data.mode || rows[0].mode, data.status || rows[0].status, data.suhu_aktual || rows[0].suhu_aktual, data.suhu_batas_nyala || rows[0].suhu_batas_nyala, data.suhu_batas_mati || rows[0].suhu_batas_mati, data.kelembapan_aktual || rows[0].kelembapan_aktual, data.kelembapan_batas_nyala || rows[0].kelembapan_batas_nyala, data.kelembapan_batas_mati || rows[0].kelembapan_batas_mati, data.jam_mati || rows[0].jam_mati, data.menit_mati || rows[0].menit_mati, data.detik_mati || rows[0].detik_mati, params 
    ])
    let message = 'error in updating data';
    if(!query.affectedRows) return message;
    return query;
}

exports.delete = async (fields, params) => {
    const query = await db.query(`DELETE FROM perangkat WHERE `+fields+ ` = ?`, [params])

    let message = 'error in deleting data'
    if(!query.affectedRows) return message;
    return query;
}