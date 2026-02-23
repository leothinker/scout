import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: 'axios',
  input: 'openapi.json',
  output: 'client/src/api',
});
