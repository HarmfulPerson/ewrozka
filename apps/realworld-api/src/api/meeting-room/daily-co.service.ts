import { AllConfigType } from '@/config/config.type';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DAILY_API = 'https://api.daily.co/v1';

/** Ile minut przed startem spotkania token staje się ważny */
const NBF_OFFSET_MINUTES = 10;
/** Ile minut po końcu spotkania token wygasa */
const EXP_OFFSET_MINUTES = 5;

@Injectable()
export class DailyCoService {
  private readonly logger = new Logger(DailyCoService.name);
  private readonly apiKey: string;
  private readonly domain: string;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    this.apiKey = this.configService.get('daily.apiKey', { infer: true }) ?? '';
    this.domain = this.configService.get('daily.domain', { infer: true }) ?? '';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /** Zwraca pełny URL pokoju Daily.co */
  roomUrl(roomName: string): string {
    return `https://${this.domain}/${roomName}`;
  }

  /**
   * Tworzy pokój Daily.co jeśli jeszcze nie istnieje.
   * Pokój jest prywatny – wejście tylko przez token.
   */
  async ensureRoom(roomName: string): Promise<void> {
    // Sprawdź czy pokój już istnieje
    const checkRes = await fetch(`${DAILY_API}/rooms/${roomName}`, {
      headers: this.headers,
    });

    if (checkRes.ok) {
      this.logger.debug(`Daily.co room already exists: ${roomName}`);
      return;
    }

    if (checkRes.status !== 404) {
      const err = await checkRes.text();
      this.logger.error(`Daily.co check room error: ${err}`);
      return;
    }

    // Utwórz nowy pokój (prywatny)
    const createRes = await fetch(`${DAILY_API}/rooms`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          enable_prejoin_ui: false,
          enable_knocking: false,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      this.logger.error(`Daily.co create room error: ${err}`);
    } else {
      this.logger.log(`Daily.co room created: ${roomName}`);
    }
  }

  /**
   * Generuje meeting token z oknem czasowym:
   * - nbf: startsAt - 10 min
   * - exp: endsAt  + 5 min
   *
   * Token jest podpisany przez Daily.co – nie można go sfałszować.
   */
  async createMeetingToken(
    roomName: string,
    startsAt: Date,
    endsAt: Date,
    isOwner = false,
  ): Promise<string> {
    const nbf = Math.floor(
      (startsAt.getTime() - NBF_OFFSET_MINUTES * 60_000) / 1000,
    );
    const exp = Math.floor(
      (endsAt.getTime() + EXP_OFFSET_MINUTES * 60_000) / 1000,
    );

    const res = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: isOwner,
          nbf,
          exp,
          enable_screenshare: false,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Daily.co create token error: ${err}`);
      throw new Error('Nie można wygenerować tokenu Daily.co');
    }

    const data = (await res.json()) as { token: string };
    this.logger.debug(
      `Daily.co token created for ${roomName}, nbf=${new Date(nbf * 1000).toISOString()}, exp=${new Date(exp * 1000).toISOString()}`,
    );
    return data.token;
  }

  /**
   * Usuwa pokój Daily.co (wywołaj po zakończeniu spotkania, opcjonalnie).
   */
  async deleteRoom(roomName: string): Promise<void> {
    const res = await fetch(`${DAILY_API}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (res.ok) {
      this.logger.log(`Daily.co room deleted: ${roomName}`);
    }
  }
}
