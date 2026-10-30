const http = require('http');
const crypto = require('crypto');

const JWT_SECRET = 'aa0498d2714ebcf566d0ea2e4c8352c60c4d46357c80f2aebbd059d21dff07bc9f39520b8d580038a5b051bc72a38e83132fb0dd38e687505456e24734134175';

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const sig = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${sig}`;
}

const token = signJwt({
  sub: 'usr_e_t213a_1793256184580',
  role: 'ENCARGADO',
  businessId: 'biz_t213a_1793256184580',
  exp: Math.floor(Date.now() / 1000) + 3600
}, JWT_SECRET);

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const paths = [
    '/pos/channels/config',
    '/pos/channels/drivers',
    '/pos/reports/sales-by-channel',
    '/pos/reports/sales-by-channels',
    '/pos/reports/channel-sales',
    '/pos/reports/domicilio',
    '/pos/reports/pedidosya',
    '/pos/reports',
    '/reports/sales-by-channel',
    '/pos/pedidosya/settlement',
    '/pos/pedidosya/settlements'
  ];
  for (const p of paths) {
    const res = await get(p);
    console.log(p, '->', res.status, res.body.substring(0, 100));
  }
}

run();
