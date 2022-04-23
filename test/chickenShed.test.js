const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../bin/www')
const assert = require('assert')

const fetch = require('node-fetch')

chai.use(chaiHttp)
chai.should()

const url = 'https://auth.chickinindonesia.com/auth/login'
const username = "superadmin"
const password = "IniP4sswordSuper"

let headers = new fetch.Headers()

headers.set('Authorization', 'Basic ' + Buffer.from(username + ":" + password).toString('base64'));

describe("Chicken-Shed endpoint", () => {
    it("should be unauthorized to get all chicken shed without token", (done) => {
        chai.request(server)
        .get('/api/v2/chicken-shed')
        .end((err, res) => {
            res.should.have.status(401)
            done()
        })
    })

    it("should get all chicken-shed", async () => {
      const auth = await fetch(url, {method: 'POST', headers: headers})
      const response = await auth.json()
      chai.request(server)
      .get('/api/v2/chicken-shed')
      .set('authorization', `Bearer ${response.token}`)
      .end((err, res) => {
        chai.expect(err).to.be.null;
        res.should.have.status(200);
        // done();
      })
  })
})

