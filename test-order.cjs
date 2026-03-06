const http = require('http');

const data = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const token = JSON.parse(body).token;
    
    const reqProducts = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/products',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (resProducts) => {
      let bodyProducts = '';
      resProducts.on('data', (chunk) => bodyProducts += chunk);
      resProducts.on('end', () => {
        const products = JSON.parse(bodyProducts);
        if (products.length === 0) {
          console.log('No products found');
          return;
        }
        
        const orderData = JSON.stringify({
          type: 'table',
          reference: '5',
          items: [{ product_id: products[0].id, product_name: products[0].name, quantity: 1, price: products[0].price }],
          subtotal: products[0].price,
          tax: 0,
          discount: 0,
          total: products[0].price,
          payment_method: 'pending',
          status: 'open'
        });

        const req2 = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/api/orders',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': orderData.length
          }
        }, (res2) => {
          let body2 = '';
          res2.on('data', (chunk) => body2 += chunk);
          res2.on('end', () => {
            console.log('Status:', res2.statusCode);
            console.log('Response:', body2);
          });
        });
        req2.write(orderData);
        req2.end();
      });
    });
    reqProducts.end();
  });
});
req.write(data);
req.end();
