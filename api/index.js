import { handler } from '../dist/server/entry.mjs';

export default function (req, res) {
  return handler(req, res);
}
