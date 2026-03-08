import { CardData, CardType, PhotoQuery, NowPlayingData, ContactData, ActionPayload, ActionType } from '../types';

// ─── Builders ────────────────────────────────────────────────────────────────

function buildCard(type: CardType, content: string, metadata?: Record<string, unknown>): CardData {
  return { type, content, metadata };
}

// ─── Marker extractors ───────────────────────────────────────────────────────

/** Remove all [MARKER: ...] tags from content and return clean text */
function stripMarkers(content: string): string {
  return content.replace(/\[[A-Z_]+:[^\]]*\]/gi, '').replace(/\[[A-Z_]+\]/gi, '').trim();
}

/** Parse key=value pairs from a marker: KEY="val", KEY=val, KEY=123 */
function parseMarkerParams(params: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /(\w+)="([^"]*?)"|(\w+)=([^\s,\]]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(params)) !== null) {
    if (m[1]) result[m[1]] = m[2];
    else if (m[3]) result[m[3]] = m[4];
  }
  return result;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseResponse(
  content: string,
  metadata?: Record<string, unknown>
): CardData {
  const lower = content.toLowerCase();

  // ── Action markers — executable actions (highest priority) ────────────────

  const actionMatch = content.match(/\[ACTION:(\w+)((?:\s+\w+="[^"]*")*)\]/i);
  if (actionMatch) {
    const actionType = actionMatch[1] as ActionType;
    const params = parseMarkerParams(actionMatch[2]);
    const cleanContent = stripMarkers(content);

    // Parse attendees as array if present
    const attendees = params.attendees
      ? params.attendees.split(',').map((a: string) => a.trim()).filter(Boolean)
      : undefined;

    const action: ActionPayload = {
      actionType,
      to: params.to,
      cc: params.cc,
      subject: params.subject,
      body: params.body,
      title: params.title,
      startTime: params.startTime,
      endTime: params.endTime,
      location: params.location,
      attendees,
      meetingSubject: params.meetingSubject,
      meetingStartTime: params.meetingStartTime,
      meetingEndTime: params.meetingEndTime,
      eventId: params.eventId,
      searchTitle: params.searchTitle,
      alarmTime: params.alarmTime,
      alarmLabel: params.alarmLabel,
      sendTo: params.sendTo,
    };

    // Map action type → card type
    const cardTypeMap: Record<string, CardType> = {
      send_email: 'email_sent',
      create_event: 'calendar_added',
      create_meeting: 'calendar_added',
      delete_event: 'calendar_added',
      update_event: 'calendar_added',
      set_alarm: 'alarm',
      cancel_alarm: 'alarm',
    };

    return buildCard(
      cardTypeMap[actionType] ?? 'generic',
      cleanContent,
      { ...metadata, action },
    );
  }

  // ── Explicit markers from AI ──────────────────────────────────────────────

  // [EMAIL_SENT]
  if (/\[EMAIL_SENT\]/i.test(content)) {
    return buildCard('email_sent', stripMarkers(content), metadata);
  }

  // [MESSAGE_SENT: to="Name"]
  const msgSentMatch = content.match(/\[MESSAGE_SENT:([^\]]*)\]/i);
  if (msgSentMatch) {
    const params = parseMarkerParams(msgSentMatch[1]);
    return buildCard('message_sent', stripMarkers(content), { ...metadata, ...params });
  }

  // [NOW_PLAYING: title="Song", artist="Artist", album="Album"]
  const nowPlayingMatch = content.match(/\[NOW_PLAYING:([^\]]*)\]/i);
  if (nowPlayingMatch) {
    const params = parseMarkerParams(nowPlayingMatch[1]);
    const np: NowPlayingData = {
      title: params.title,
      artist: params.artist,
      album: params.album,
      isPlaying: true,
      source: params.source ?? 'Spotify', // 'Spotify' or 'Apple Music'
    };
    return buildCard('now_playing', stripMarkers(content), { ...metadata, nowPlaying: np });
  }

  // [CALENDAR_ADDED]
  if (/\[CALENDAR_ADDED\]/i.test(content)) {
    return buildCard('calendar_added', stripMarkers(content), metadata);
  }

  // [CALENDAR_EVENTS] or [CALENDAR_EVENTS: count=N]
  const calEventsMatch = content.match(/\[CALENDAR_EVENTS(?::([^\]]*))?\]/i);
  if (calEventsMatch) {
    const params = calEventsMatch[1] ? parseMarkerParams(calEventsMatch[1]) : {};
    return buildCard('calendar_events', stripMarkers(content), { ...metadata, ...params });
  }

  // [MAPS: destination="Place"]
  const mapsMatch = content.match(/\[MAPS:([^\]]*)\]/i);
  if (mapsMatch) {
    const params = parseMarkerParams(mapsMatch[1]);
    return buildCard('map', stripMarkers(content), { ...metadata, destination: params.destination });
  }

  // [NOTES_RESULT: count=N]
  const notesMatch = content.match(/\[NOTES_RESULT(?::([^\]]*))?\]/i);
  if (notesMatch) {
    return buildCard('notes', stripMarkers(content), metadata);
  }

  // [BRIEFING]
  if (/\[BRIEFING\]/i.test(content)) {
    return buildCard('briefing', stripMarkers(content), metadata);
  }

  // [HOME: action="done", device="lights"]
  const homeMatch = content.match(/\[HOME:([^\]]*)\]/i);
  if (homeMatch) {
    const params = parseMarkerParams(homeMatch[1]);
    return buildCard('home', stripMarkers(content), { ...metadata, ...params });
  }

  // [STOCKS: symbols="AAPL,TSLA"]
  const stocksMatch = content.match(/\[STOCKS(?::([^\]]*))?\]/i);
  if (stocksMatch) {
    return buildCard('stocks', stripMarkers(content), metadata);
  }

  // [PHONE_CALL: number="+31612345678"]
  const phoneMatch = content.match(/\[PHONE_CALL:([^\]]*)\]/i);
  if (phoneMatch) {
    const params = parseMarkerParams(phoneMatch[1]);
    return buildCard('system_control', stripMarkers(content), { ...metadata, phoneNumber: params.number, action: 'phone_call' });
  }

  // [EMAIL_DRAFT_SAVED]
  if (/\[EMAIL_DRAFT_SAVED\]/i.test(content)) {
    return buildCard('email_sent', stripMarkers(content), { ...metadata, isDraft: true });
  }

  // [ALARM: time="7:00 AM"]
  const alarmMatch = content.match(/\[ALARM:([^\]]*)\]/i);
  if (alarmMatch) {
    const params = parseMarkerParams(alarmMatch[1]);
    return buildCard('alarm', stripMarkers(content), { ...metadata, time: params.time });
  }

  // [NEWS: count=5]
  if (/\[NEWS(?::[^\]]*)?\]/i.test(content)) {
    return buildCard('news', stripMarkers(content), metadata);
  }

  // [SYSTEM: action="done"]
  const sysMatch = content.match(/\[SYSTEM:([^\]]*)\]/i);
  if (sysMatch) {
    const params = parseMarkerParams(sysMatch[1]);
    return buildCard('system_control', stripMarkers(content), { ...metadata, ...params });
  }

  // [CONTACT: name="Name", email="email", phone="phone"]
  const contactMatch = content.match(/\[CONTACT:([^\]]*)\]/i);
  if (contactMatch) {
    const params = parseMarkerParams(contactMatch[1]);
    const contact: ContactData = {
      name: params.name,
      email: params.email,
      phone: params.phone,
    };
    return buildCard('contact', stripMarkers(content), { ...metadata, contact });
  }

  // ── Photos markers ────────────────────────────────────────────────────────
  // [PHOTO_SHOW: caption="...", person="Name"] — hero display for single photo
  const photoShowMarker = content.match(/\[PHOTO_SHOW(?::([^\]]*))?\]/i);
  if (photoShowMarker) {
    const params = photoShowMarker[1] ? parseMarkerParams(photoShowMarker[1]) : {};
    const photoQuery: PhotoQuery = { limit: 1 };
    if (params.person) photoQuery.personName = params.person;
    return buildCard('photos', stripMarkers(content), { ...metadata, photoQuery, caption: params.caption });
  }

  const photoMarker = content.match(/\[PHOTO_QUERY:([^\]]*)\]/i);
  if (photoMarker) {
    const query = parsePhotoQuery(photoMarker[1]);
    return buildCard('photos', content.replace(/\[PHOTO_QUERY:[^\]]*\]/gi, '').trim(), { ...metadata, photoQuery: query });
  }

  // ── Navigation marker ──────────────────────────────────────────────────────
  const navMarker = content.match(/\[NAVIGATE(?::([^\]]*))?\]/i);
  if (navMarker) {
    const params = navMarker[1] ? parseMarkerParams(navMarker[1]) : {};
    return buildCard('navigation', stripMarkers(content), { ...metadata, destination: params.destination, eta: params.eta, distance: params.distance });
  }

  // ── Sports / F1 marker ────────────────────────────────────────────────────
  const sportsMarker = content.match(/\[(?:SPORTS|F1)(?::([^\]]*))?\]/i);
  if (sportsMarker) {
    const params = sportsMarker[1] ? parseMarkerParams(sportsMarker[1]) : {};
    return buildCard('sports', stripMarkers(content), { ...metadata, ...params });
  }

  // ── Places marker ─────────────────────────────────────────────────────────
  const placesMarker = content.match(/\[PLACES(?::([^\]]*))?\]/i);
  if (placesMarker) {
    const params = placesMarker[1] ? parseMarkerParams(placesMarker[1]) : {};
    return buildCard('places', stripMarkers(content), { ...metadata, ...params });
  }

  // ── Flight marker ─────────────────────────────────────────────────────────
  const flightMarker = content.match(/\[FLIGHT(?::([^\]]*))?\]/i);
  if (flightMarker) {
    const params = flightMarker[1] ? parseMarkerParams(flightMarker[1]) : {};
    return buildCard('flight', stripMarkers(content), { ...metadata, ...params });
  }

  // ── Package marker ────────────────────────────────────────────────────────
  const packageMarker = content.match(/\[PACKAGE(?::([^\]]*))?\]/i);
  if (packageMarker) {
    const params = packageMarker[1] ? parseMarkerParams(packageMarker[1]) : {};
    return buildCard('package', stripMarkers(content), { ...metadata, ...params });
  }

  // ── Document marker ───────────────────────────────────────────────────────
  const docMarker = content.match(/\[DOCUMENT(?::([^\]]*))?\]/i);
  if (docMarker) {
    const params = docMarker[1] ? parseMarkerParams(docMarker[1]) : {};
    return buildCard('document', stripMarkers(content), { ...metadata, ...params });
  }

  // ── Routine marker ────────────────────────────────────────────────────────
  const routineMarker = content.match(/\[ROUTINE(?::([^\]]*))?\]/i);
  if (routineMarker) {
    const params = routineMarker[1] ? parseMarkerParams(routineMarker[1]) : {};
    return buildCard('routine', stripMarkers(content), { ...metadata, ...params });
  }

  // ── Health marker ─────────────────────────────────────────────────────────
  const healthMarker = content.match(/\[HEALTH(?::([^\]]*))?\]/i);
  if (healthMarker) {
    const params = healthMarker[1] ? parseMarkerParams(healthMarker[1]) : {};
    return buildCard('health', stripMarkers(content), { ...metadata, ...params });
  }

  // ── Priority: explicit tool metadata from OpenClaw ────────────────────────
  if (metadata) {
    const tool = metadata.tool as string | undefined;
    if (tool === 'google_calendar' || tool === 'calendar') return buildCard('calendar_added', content, metadata);
    if (tool === 'weather') return buildCard('weather', content, metadata);
    if (tool === 'gmail' || tool === 'email') return buildCard('email_sent', content, metadata);
    if (tool === 'timer') return buildCard('timer', content, metadata);
    if (tool === 'reminder') return buildCard('reminder', content, metadata);
  }

  // ── Keyword detection fallback ────────────────────────────────────────────

  if (/added.*(calendar|event)|event.*(created|scheduled)|calendar.*added|meeting.*scheduled/.test(lower)) {
    return buildCard('calendar_added', content, metadata);
  }
  if (/(\d+°|\d+ degrees|temperature|feels like|humidity|weather|forecast|sunny|cloudy|rain|snow)/.test(lower)) {
    return buildCard('weather', content, metadata);
  }
  if (/(email sent|sent.*email|sent.*message|message.*sent|email.*delivered)/.test(lower)) {
    return buildCard('email_sent', content, metadata);
  }
  if (/(imessage sent|text sent|sms sent|sent.*text|message.*sent.*to)/.test(lower)) {
    return buildCard('message_sent', content, metadata);
  }
  if (/(timer set|starting.*timer|\d+ minutes? timer|timer.*started|set.*timer)/.test(lower)) {
    return buildCard('timer', content, metadata);
  }
  if (/(reminder set|will remind|reminder.*at|reminding you|set.*reminder)/.test(lower)) {
    return buildCard('reminder', content, metadata);
  }
  if (/(now playing|playing.*by|currently playing|track.*playing|spotify.*playing)/.test(lower)) {
    return buildCard('now_playing', content, metadata);
  }
  if (/(note.*created|created.*note|saved.*note|note.*saved|added.*note)/.test(lower)) {
    return buildCard('notes', content, metadata);
  }
  if (/(navigat|direction.*to|opening.*maps|maps.*opened|route.*to)/.test(lower)) {
    return buildCard('map', content, metadata);
  }
  if (/(good morning|morning briefing|here.*briefing|your.*briefing)/.test(lower)) {
    return buildCard('briefing', content, metadata);
  }
  if (/(show.*photos?|photos?.*from|here are.*photos?|your photos?|recent photos?)/i.test(lower)) {
    return buildCard('photos', content, { ...metadata, photoQuery: { limit: 20 } });
  }
  if (/(contact.*found|found.*contact|here.*contact|calling|phone number)/i.test(lower)) {
    return buildCard('contact', content, metadata);
  }
  if (/(lights on|lights off|turned on|turned off|door locked|door unlocked|homekit|home automation|scene activated|thermostat set)/.test(lower)) {
    return buildCard('home', content, metadata);
  }
  if (/(\$[\d.]+|\baapl\b|\btsla\b|\bgoogl\b|\bmsft\b|stock price|market cap|shares|nasdaq|nyse)/i.test(lower)) {
    return buildCard('stocks', content, metadata);
  }
  if (/(alarm set|alarm.*at|set.*alarm|wake.*up.*at|alarm.*created)/.test(lower)) {
    return buildCard('alarm', content, metadata);
  }
  if (/(top news|headlines|breaking news|latest news|news today)/.test(lower)) {
    return buildCard('news', content, metadata);
  }
  if (/(navigat.*to|directions.*to|route.*to|eta.*min|driving.*to|opening.*apple.*maps.*direction)/i.test(lower)) {
    return buildCard('navigation', content, metadata);
  }
  if (/(f1.*standing|formula.*1|grand.*prix|race.*result|driver.*champion|constructor.*standing|next.*race)/i.test(lower)) {
    return buildCard('sports', content, { ...metadata, type: 'f1' });
  }
  if (/(score.*\d|match.*result|\d\s*-\s*\d|final.*score|halftime|full.*time)/i.test(lower)) {
    return buildCard('sports', content, metadata);
  }
  if (/(nearby|restaurant.*near|places.*near|found.*places|here.*places|coffee.*near|shop.*near|here are.*(?:top|best)|top \d+ (?:restaurant|cafe|coffee|place|bar|hotel|shop|gym)|(?:restaurant|cafe|coffee|place|bar|hotel|shop|gym).*(?:option|recommend|suggestion))/i.test(lower)) {
    return buildCard('places', content, metadata);
  }
  if (/(flight.*status|flight.*[A-Z]{2}\d|depart.*arriv|gate.*\w\d|boarding|in.*air|landed)/i.test(lower)) {
    return buildCard('flight', content, metadata);
  }
  if (/(package.*track|tracking.*number|in.*transit|out.*delivery|shipment|carrier.*\w)/i.test(lower)) {
    return buildCard('package', content, metadata);
  }
  if (/(document.*summar|file.*found|pdf.*summar|search.*found.*file|here.*document)/i.test(lower)) {
    return buildCard('document', content, metadata);
  }
  if (/(routine.*complet|routine.*running|step.*done|leaving.*home.*routine|bedtime.*routine|morning.*routine)/i.test(lower)) {
    return buildCard('routine', content, metadata);
  }
  if (/(steps.*today|heart.*rate|bpm|sleep.*hour|calories.*burn|health.*data|workout.*min)/i.test(lower)) {
    return buildCard('health', content, metadata);
  }

  return buildCard('generic', content, metadata);
}

// ─── Photo query parser ───────────────────────────────────────────────────────

export function parsePhotoQuery(params: string): PhotoQuery {
  const query: PhotoQuery = {};
  const fromMatch = params.match(/from=(\d{4}-\d{2}-\d{2})/i);
  const toMatch = params.match(/to=(\d{4}-\d{2}-\d{2})/i);
  const limitMatch = params.match(/limit=(\d+)/i);
  const personMatch = params.match(/person="([^"]+)"/i);
  const typeMatch = params.match(/searchType="([^"]+)"/i);
  if (fromMatch) query.from = new Date(fromMatch[1]).getTime();
  if (toMatch) query.to = new Date(toMatch[1] + 'T23:59:59').getTime();
  if (limitMatch) query.limit = parseInt(limitMatch[1]);
  if (personMatch) query.personName = personMatch[1];
  if (typeMatch) query.searchType = typeMatch[1] as PhotoQuery['searchType'];
  if (!query.limit) query.limit = 20;
  return query;
}

// ─── Timer duration extractor ─────────────────────────────────────────────────

export function extractTimerDuration(text: string): number | null {
  const hoursMatch = text.match(/(\d+)\s*hour/i);
  const minutesMatch = text.match(/(\d+)\s*min/i);
  const secondsMatch = text.match(/(\d+)\s*sec/i);

  let totalSeconds = 0;
  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);

  return totalSeconds > 0 ? totalSeconds : null;
}

// ─── Weather data extractor ──────────────────────────────────────────────────

export interface WeatherData {
  city?: string;
  temp?: string;
  condition?: string;
  high?: string;
  low?: string;
  humidity?: string;
}

export function extractWeatherData(text: string, metadata?: Record<string, unknown>): WeatherData {
  if (metadata?.weather) return metadata.weather as WeatherData;

  const tempMatch = text.match(/(-?\d+)\s*°?[CF]/);
  const conditionMatch = text.match(/(sunny|cloudy|partly cloudy|rainy|rain|snow|clear|foggy|windy|stormy)/i);
  const cityMatch = text.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);

  return {
    city: cityMatch?.[1],
    temp: tempMatch ? `${tempMatch[1]}°` : undefined,
    condition: conditionMatch?.[1],
  };
}
