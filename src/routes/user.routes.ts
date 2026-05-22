import { Router, Express } from 'express';
import { getAllUsers, getUserByEmail } from '../controllers/user.controller';

const router = Router();

const userRoutes = (app: Express) => {
    router.get('/paginate', getAllUsers);
    router.get('/', getUserByEmail);

    app.use('/users', router);
}

export default userRoutes;