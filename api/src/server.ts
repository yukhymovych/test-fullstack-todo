import 'dotenv/config';
import { app } from './app.js';

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
