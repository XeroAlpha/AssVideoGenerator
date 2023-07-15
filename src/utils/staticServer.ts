import { createServer, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { URL, URLSearchParams } from 'url';
import send from 'send';

type Handler = (
  q: URLSearchParams,
  res: ServerResponse
) => Promise<void> | void;

export class StaticServer {
  fileMap = new Map<string, string>();
  handlerMap = new Map<string, Handler>();
  server: Server;
  baseUrl: string;

  constructor(port?: number) {
    this.server = createServer((req, res) => {
      const url = new URL(req.url || '', this.baseUrl);
      const filePath = this.fileMap.get(url.pathname);
      if (filePath) {
        try {
          res.setHeader('Access-Control-Allow-Origin', '*');
          send(req, filePath).pipe(res);
          return;
        } catch (err) {
          console.error(err);
        }
      }
      const handler = this.handlerMap.get(url.pathname);
      if (handler) {
        try {
          res.setHeader('Access-Control-Allow-Origin', '*');
          return handler(url.searchParams, res);
        } catch (err) {
          console.error(err);
        }
      }
      res.writeHead(404);
      res.end();
    });
    this.server.listen(port);
    const address = this.server.address() as AddressInfo;
    this.baseUrl = `http://localhost:${address.port}/`;
    this.setHandler('local', (q, res) => {
      send(res.req, q.get('path') || '').pipe(res);
    });
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

  setHandler(id: string, handler: Handler) {
    const url = new URL(`/${id}`, this.baseUrl);
    this.handlerMap.set(url.pathname, handler);
    return url.toString();
  }

  injectEnv() {
    return {
      REMOTION_STATIC_SERVER: this.baseUrl,
    };
  }

  close() {
    this.server.close();
  }
}
