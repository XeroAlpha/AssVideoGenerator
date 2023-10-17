import { createServer, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { isAbsolute, resolve as resolvePath } from 'path';
import { get as httpGet } from 'http';
import { get as httpsGet } from 'https';
import { URL, URLSearchParams } from 'url';
import send from 'send';
import { HttpsProxyAgent } from 'https-proxy-agent';

const agent = process.env.https_proxy === undefined ? undefined : new HttpsProxyAgent(process.env.https_proxy);

type Handler = (
  q: URLSearchParams,
  res: ServerResponse
) => Promise<void> | void;

export class StaticServer {
  private fileMap = new Map<string, string>();
  private handlerMap = new Map<string, Handler>();
  private server: Server;
  private baseUrl: string;
  private relativeRoot: string | undefined;

  constructor(port?: number) {
    this.server = createServer((req, res) => {
      const url = new URL(req.url || '', this.baseUrl);
      const filePath = this.fileMap.get(url.pathname);
      if (filePath) {
        try {
          res.setHeader('Access-Control-Allow-Origin', '*');
          this.sendFile(res, filePath);
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
      this.sendFile(res, q.get('path') || '');
    });
    this.setHandler('proxy', (q, res) => {
      const url = q.get('url');
      if (url) {
        const get = url.startsWith('https:') ? httpsGet : httpGet;
        const proxyReq = get(url, { agent }, (proxyRes) => {
          proxyRes.pipe(res, { end: true });
        });
        res.req.pipe(proxyReq, { end: true });
        return;
      }
      res.writeHead(400);
      res.end();
    });
  }

  private sendFile(res: ServerResponse, path: string) {
    let resolvedPath = path;
    if (!isAbsolute(path) && this.relativeRoot) {
      resolvedPath = resolvePath(this.relativeRoot, path);
    }
    send(res.req, resolvedPath).pipe(res);
  }

  setRootDir(path: string) {
    this.relativeRoot = path;
    return this;
  }

  setFile(id: string, realPath: string) {
    const url = new URL(`/${id}`, this.baseUrl);
    this.fileMap.set(url.pathname, realPath);
    return url.toString();
  }

  toUrlIfNecessary(id: string, pathOrUrl: string) {
    if (pathOrUrl.startsWith('http')) {
      return pathOrUrl;
    }
    return this.setFile(id, pathOrUrl);
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
