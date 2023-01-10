import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { URL } from 'url';
import send from 'send';

export class StaticServer {
  fileMap = new Map<string, string>();
  server: Server;
  baseUrl: string;

  constructor(port?: number) {
    this.server = createServer((req, res) => {
      const url = new URL(req.url || '', this.baseUrl);
      const filePath = this.fileMap.get(url.pathname);
      if (filePath) {
        try {
          send(req, filePath).pipe(res);
          return;
        } catch (err) {
          console.error(err);
        }
      }
      res.writeHead(404);
      res.end();
    });
    this.server.listen(port);
    const address = this.server.address() as AddressInfo;
    this.baseUrl = `http://127.0.0.1:${address.port}/`;
  }

  getFileUrl(id: string, realPath: string) {
    const url = new URL(`/${id}`, this.baseUrl);
    this.fileMap.set(url.pathname, realPath);
    return url.toString();
  }

  toUrlIfNecessary(id: string, pathOrUrl: string) {
    if (pathOrUrl.startsWith('http')) {
      return pathOrUrl;
    }
    return this.getFileUrl(id, pathOrUrl);
  }

  close() {
    this.server.close();
  }
}
