import { Injectable, NestMiddleware } from '@nestjs/common';
import { parseStringPromise, Builder } from 'xml2js';
import * as yaml from 'js-yaml';

@Injectable()
export class ContentNegotiationMiddleware implements NestMiddleware {
  async use(req: any, res: any, next: () => void) {
    const contentType = req.headers['content-type'];
    const accept = req.headers['accept'];

    // Handle request body parsing
    if (contentType === 'application/xml') {
      const rawBody = req.body.toString();
      req.body = await parseStringPromise(rawBody);
    } else if (contentType === 'application/x-yaml') {
      req.body = yaml.load(req.body.toString());
    } // JSON is handled by default

    // Hook into the response
    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (accept === 'application/xml') {
        const builder = new Builder();
        body = builder.buildObject(body);
        res.setHeader('Content-Type', 'application/xml');
      } else if (accept === 'application/x-yaml') {
        body = yaml.dump(body);
        res.setHeader('Content-Type', 'application/x-yaml');
      } // JSON is handled by default

      return originalSend(body);
    };

    next();
  }
}
