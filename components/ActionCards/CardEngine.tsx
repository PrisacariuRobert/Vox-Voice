import { CardData, PhotoQuery, ActionStatus } from '../../types';
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
import { NavigationCard } from './NavigationCard';
import { SportsCard } from './SportsCard';
import { PlacesCard } from './PlacesCard';
import { FlightCard } from './FlightCard';
import { PackageCard } from './PackageCard';
import { DocumentCard } from './DocumentCard';
import { RoutineCard } from './RoutineCard';
import { HealthCard } from './HealthCard';

interface CardEngineProps {
  card: CardData;
  actionStatus?: ActionStatus | null;
  actionError?: string | null;
  actionProvider?: string | null;
  actionData?: Record<string, unknown> | null;
}

export function CardEngine({ card, actionStatus, actionError, actionProvider, actionData }: CardEngineProps) {
  switch (card.type) {
    case 'calendar_added':
    case 'calendar_events':
      return <CalendarCard content={card.content} metadata={card.metadata} actionStatus={actionStatus} actionError={actionError} actionProvider={actionProvider} actionData={actionData} />;

    case 'weather':
      return <WeatherCard content={card.content} metadata={card.metadata} />;

    case 'email_sent':
    case 'email_read':
      return <EmailCard content={card.content} metadata={card.metadata} actionStatus={actionStatus} actionError={actionError} actionProvider={actionProvider} />;

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

    case 'navigation':
      return <NavigationCard content={card.content} metadata={card.metadata} />;

    case 'sports':
      return <SportsCard content={card.content} metadata={card.metadata} />;

    case 'places':
      return <PlacesCard content={card.content} metadata={card.metadata} />;

    case 'flight':
      return <FlightCard content={card.content} metadata={card.metadata} />;

    case 'package':
      return <PackageCard content={card.content} metadata={card.metadata} />;

    case 'document':
      return <DocumentCard content={card.content} metadata={card.metadata} />;

    case 'routine':
      return <RoutineCard content={card.content} metadata={card.metadata} />;

    case 'health':
      return <HealthCard content={card.content} metadata={card.metadata} />;

    case 'generic':
    default:
      return <GenericCard content={card.content} />;
  }
}
