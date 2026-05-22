
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { validateUser } from '../../services/auth.service';

const configPassportLocal = () => {
    passport.use(new LocalStrategy(
        { usernameField: 'email', passwordField: 'password' },
        async (email, password, cb) => {
            try {
                const user = await validateUser(email, password);
                return cb(null, user);
            } catch (error: any) {
                return cb(null, false, { message: error.message || 'Incorrect email or password.' });
            }
        }
    ));
}
export default configPassportLocal;
