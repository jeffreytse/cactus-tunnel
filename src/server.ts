import http from 'http';

const requestListener: http.RequestListener = function (req, res) {
  console.log(req.headers);
  res.end('Hello, World!');
}

const startServer = function (port: number): http.Server {
  const httpServer = http.createServer(requestListener);

  httpServer.listen(port, function () {
    console.log(`Http Server is running on port ${port}...`);
  });

  return httpServer;
}

export default { startServer }
