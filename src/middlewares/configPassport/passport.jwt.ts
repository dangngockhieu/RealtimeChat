import passport from 'passport';
import 'dotenv/config';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptionsWithoutRequest, VerifiedCallback } from 'passport-jwt';
import { getUserById } from '../../services/user.service';
import { JwtPayload } from 'jsonwebtoken';

const configPassportJwt = () => {
    const opts: StrategyOptionsWithoutRequest = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET!,
    };

    passport.use(
        new JwtStrategy(opts, async (payload: JwtPayload, done: VerifiedCallback) => {
            try {
                const user = await getUserById(payload.id);

                if (user) {
                    if (!user.isActive) {
                        return done(null, false, { message: 'Tài khoản chưa được kích hoạt' });
                    }
                    const { id, email, role } = user;
                    return done(null, { id, email, role });
                } else {
                    return done(null, false, { message: 'Không tìm thấy người dùng' });
                }
            } catch (error: any) {
                return done(error, false);
            }
        })
    );
};

export default configPassportJwt;