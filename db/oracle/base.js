'use strict';
/**
 * Created by Jesn on 2018/10/18.
 * 连接oracle其类
 */

const oracledb = require('oracledb'),
    Err = require('../../tool/error'),
    Ut = require('../../tool/utils'),
    Etc = Ut.getEtc(),
    oracles = Etc && Etc.db && Etc.db.oracle;

let dbs = {};

class cls {
    constructor(name,server) {
        if(!server && oracles) {
            Object.keys(oracles).map(k => {
                server = server || k;
            });
        }
        if(!server || !oracles) return;

        this.type = 'oracle';
        this.server = server;
        this.name = name;
        this.connection = null;
        this.is_log = Etc.log && Etc.log.db;

        oracledb.maxRows = 1000;
        oracledb.outFormat = oracledb.OBJECT;
        oracledb.autoCommit = true;
    }
}

cls.prototype.init = async function () {
    if(this.connection) return this.connection;

    console.log('db:oracle start.');
    let pool = await this.createPool();
    return new Promise((resolve,reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                Err.log(Err.error_log_type.db, 'oracle connect fail.', err);
                return reject(Err.get(Err.db_fail,err));
            }else {
                console.log('db:oracle success.');
                this.connection = connection;
                return resolve(connection);
            }
        });
    })
};

cls.prototype.createPool = function () {
    if(dbs[this.server]) return dbs[this.server];

    return new Promise((resolve,reject) => {
        if(!oracles || !this.server
            || !oracles[this.server]
            || !oracles[this.server].connection) {
            Err.log(Err.error_log_type.etc,'read etc.db.oracle fail.');
            return reject(Err.get(Err.db_fail,null,'oracle配置信息出错'));
        }

        oracledb.createPool(oracles[this.server].connection,(err,pool) => {
            if(!err && pool) {
                dbs[this.server] = pool;
                return resolve(pool);
            }

            Err.log(Err.error_log_type.db,'oracle createPool fail.');
            return reject(Err.get(Err.db_fail,err,'oracle创建池出错'));
        });
    });
};

cls.prototype.disConnect = function () {
    if(this.connection) {
        this.connection.release();
        this.connection = null;
    }
};

/**
 * 执行sql语句
 * @param sql ｜必须｜string｜sql语句
 * @param connecting ｜非必须｜boolean｜默认false：断开连接。
 * @returns {Promise}
 */
cls.prototype.exec = async function (sql,connecting) {
    let cnn = await this.init();

    return await new Promise((resolve, reject) => {
        if(this.is_log) console.log(sql);
        cnn.execute(sql, (err, result) => {
            //if(!connecting) this.disConnect();//todo：大批量访问有问题，待优化
            if(err) {
                Err.log(Err.error_log_type.db,'oracle',sql,err);
                return reject(Err.get(Err.db_fail,err));
            }
            if(result && result.rows) result = result.rows;
            return resolve(result);
        })
    });
};

module.exports = cls;