import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import configPassportLocal from './middlewares/configPassport/passport.local';
import configPassportJwt from './middlewares/configPassport/passport.jwt';
import { responseFormatter } from './middlewares/formatResponse/success/successResponse';
import { errorHandler } from './middlewares/formatResponse/exception/errorHandler';
import friendshipRoutes from './routes/friendship.routes';
import conversationRoutes from './routes/conversation.routes';

const app = express();
const origins = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: origins && origins.length > 0 ? origins : true,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

app.use(passport.initialize());
configPassportLocal();
configPassportJwt();

// Áp dụng middleware formatResponse (SUCCESS)
app.use(responseFormatter);

// Config routes
userRoutes(app);
friendshipRoutes(app);
conversationRoutes(app);
authRoutes(app);

app.get('/', (_req, res) => {
  res.send("Server is running");
});

// Áp dụng middleware Error Handler (EXCEPTION)
app.use(errorHandler);

export default app;
