interface Env {
  GOOGLE_CLIENT_SECRET: string;
  PINTHREAD_HOSTED?: string;
  PINTHREAD_PAUSED?: string;
  EDGE_LIMIT?: RateLimit;
  PINTHREAD_VERSION?: { id: string };
}

declare module "*.txt" {
  const content: string;
  export default content;
}
