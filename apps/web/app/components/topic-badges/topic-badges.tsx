import { TopicIcon } from '../topic-icon/topic-icon';
import './topic-badges.css';

interface TopicBadgesProps {
  topics: string[];
  iconSize?: number;
}

export function TopicBadges({ topics, iconSize = 14 }: TopicBadgesProps) {
  if (topics.length === 0) return null;

  return (
    <div className="topic-badges">
      {topics.map((topic, i) => (
        <span key={i} className="topic-badges__item">
          <TopicIcon name={topic} size={iconSize} />
          {topic}
        </span>
      ))}
    </div>
  );
}
