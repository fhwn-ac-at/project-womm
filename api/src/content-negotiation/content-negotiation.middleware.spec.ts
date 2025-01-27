import { ContentNegotiationMiddleware } from './content-negotiation.middleware';

describe('ContentNegotiationMiddleware', () => {
  it('should be defined', () => {
    expect(new ContentNegotiationMiddleware()).toBeDefined();
  });
});
