const http = require('http');

const request = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(data) }));
    });
    
    req.on('error', error => reject(error));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function test() {
  try {
    console.log('Logging in admin...');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@fixit.com',
      password: 'adminpassword123'
    });
    console.log('Response:', loginRes.statusCode, loginRes.data);
  } catch (err) {
    console.error(err);
  }
}

test();
