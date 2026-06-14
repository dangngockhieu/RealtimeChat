import 'reflect-metadata';
import 'dotenv/config';
import app from './app';
import { connectDB } from './configs/database';
import { createServer } from 'http';
import { initSocket } from './services/socket.service';
const port = Number(process.env.PORT) || 3000;

const bootstrap = async (): Promise<void> => {
  try {
    await connectDB();
    const httpServer = createServer(app);
    initSocket(httpServer);
    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

void bootstrap();
