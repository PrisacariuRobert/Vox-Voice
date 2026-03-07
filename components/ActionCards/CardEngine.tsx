import { CardData, PhotoQuery } from '../../types';
import { GenericCard } from './GenericCard';
import { CalendarCard } from './CalendarCard';
import { WeatherCard } from './WeatherCard';
import { TimerCard } from './TimerCard';
import { EmailCard } from './EmailCard';
import { PhotosCard } from './PhotosCard';
import { NowPlayingCard } from './NowPlayingCard';
import { MessageSentCard } from './MessageSentCard';
import { NotesCard } from './NotesCard';
import { MapsCard } from './MapsCard';
import { ContactCard } from './ContactCard';
import { BriefingCard } from './BriefingCard';
import { SystemControlCard } from './SystemControlCard';
import { StocksCard } from './StocksCard';
import { HomeCard } from './HomeCard';
import { AlarmCard } from './AlarmCard';
import { NewsCard } from './NewsCard';

interface CardEngineProps {
  card: CardData;
}

export function CardEngine({ card }: CardEngineProps) {
  switch (card.type) {
    case 'calendar_added':
    case 'calendar_events':
      return <CalendarCard content={card.content} metadata={card.metadata} />;

    case 'weather':
      return <WeatherCard content={card.content} metadata={card.metadata} />;

    case 'email_sent':
    case 'email_read':
      return <EmailCard content={card.content} metadata={card.metadata} />;

    case 'timer':
      return <TimerCard content={card.content} metadata={card.metadata} />;

    case 'photos':
      return (
        <PhotosCard
          content={card.content}
          query={(card.metadata?.photoQuery as PhotoQuery) ?? { limit: 20 }}
        />
      );

    case 'now_playing':
    case 'music':
      return <NowPlayingCard content={card.content} metadata={card.metadata} />;

    case 'message_sent':
      return <MessageSentCard content={card.content} metadata={card.metadata} />;

    case 'notes':
      return <NotesCard content={card.content} metadata={card.metadata} />;

    case 'map':
      return <MapsCard content={card.content} metadata={card.metadata} />;

    case 'contact':
      return <ContactCard content={card.content} metadata={card.metadata} />;

    case 'briefing':
      return <BriefingCard content={card.content} metadata={card.metadata} />;

    case 'system_control':
      return <SystemControlCard content={card.content} metadata={card.metadata} />;

    case 'stocks':
      return <StocksCard content={card.content} metadata={card.metadata} />;

    case 'home':
      return <HomeCard content={card.content} metadata={card.metadata} />;

    case 'alarm':
      return <AlarmCard content={card.content} metadata={card.metadata} />;

    case 'news':
      return <NewsCard content={card.content} metadata={card.metadata} />;

    case 'generic':
    default:
      return <GenericCard content={card.content} />;
  }
}
