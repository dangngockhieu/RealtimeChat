import { Injectable } from '@nestjs/common';
import { Friendship } from './schemas/friendship.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class FriendshipRepository {
    constructor(@InjectModel(Friendship.name) private friendShipModel: Model<Friendship>) {}

    // TÌm kiếm mối quan hệ bạn bè giữa 2 người dùng để kiểm tra trạng thái, hoặc lấy thông tin bạn bè
    async findFriendship(userId1: string, userId2: string){
        return this.friendShipModel.findOne({
            $or: [
                { requester: userId1, recipient: userId2 },
                { requester: userId2, recipient: userId1 }
            ]
        }).exec();
    }

}
