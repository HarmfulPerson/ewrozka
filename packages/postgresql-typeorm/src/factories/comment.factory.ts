import { setSeederFactory } from 'typeorm-extension';
import { CommentEntity } from '../entities';

export default setSeederFactory(CommentEntity, (fake) => {
  const comment = new CommentEntity();

  comment.body = fake.lorem.paragraphs(1);
  comment.articleId = '00000000-0000-0000-0000-000000000000';
  comment.authorId = '00000000-0000-0000-0000-000000000000';

  return comment;
});
